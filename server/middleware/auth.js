const { Parse } = require('../parse');
const { maybeTouchLastActiveAt } = require('../lib/lastActiveAt');
const normalizeRoles = require('../lib/normalizeRoles');

/** In-memory cache: repeated requests (e.g. timer buttons) skip 2 Mongo round-trips per hit. */
const AUTH_CACHE_TTL_MS = 120_000;
const AUTH_CACHE_MAX = 2500;
const authCache = new Map(); // sessionToken -> { at, user }

function pruneAuthCache(now) {
  for (const [k, v] of authCache) {
    if (now - v.at >= AUTH_CACHE_TTL_MS) authCache.delete(k);
  }
  while (authCache.size > AUTH_CACHE_MAX) {
    const k = authCache.keys().next().value;
    authCache.delete(k);
  }
}

function cacheUserPayload(parseUser) {
  return {
    id: parseUser.id,
    roles: normalizeRoles(parseUser.get('roles')),
    accountId: parseUser.get('accountId') || null,
    firstName: parseUser.get('firstName') || '',
    lastName: parseUser.get('lastName') || '',
    username: parseUser.get('username') || '',
  };
}

module.exports = async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const sessionToken = authHeader.slice(7);
  const now = Date.now();
  pruneAuthCache(now);
  const cached = authCache.get(sessionToken);
  if (cached && (now - cached.at) < AUTH_CACHE_TTL_MS) {
    req.user = cached.user;
    maybeTouchLastActiveAt(req.user.id);
    return next();
  }

  try {
    // Query the _Session collection directly with masterKey — avoids the
    // HTTP round-trip that Parse.User.become() requires, and works reliably
    // in self-hosted Parse Server environments.
    const sessionQuery = new Parse.Query('_Session');
    sessionQuery.equalTo('sessionToken', sessionToken);
    const session = await sessionQuery.first({ useMasterKey: true });

    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const ref = session.get('user');
    const userId =
      typeof ref === 'string'
        ? ref
        : ref?.id || ref?.objectId || null;
    if (!userId) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    const parseUser = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });

    const user = cacheUserPayload(parseUser);
    req.user = user;
    authCache.set(sessionToken, {
      at: now,
      user: {
        ...user,
        roles: [...user.roles],
      },
    });
    maybeTouchLastActiveAt(req.user.id);
    next();
  } catch (err) {
    console.error('[auth] session validation error:', err.message);
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
};
