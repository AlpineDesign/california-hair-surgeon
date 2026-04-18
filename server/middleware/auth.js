const { Parse } = require('../parse');
const { maybeTouchLastActiveAt } = require('../lib/lastActiveAt');
const normalizeRoles = require('../lib/normalizeRoles');

module.exports = async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const sessionToken = authHeader.slice(7);
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

    req.user = {
      id:        parseUser.id,
      roles:     normalizeRoles(parseUser.get('roles')),
      accountId: parseUser.get('accountId') || null,
      firstName: parseUser.get('firstName') || '',
      lastName:  parseUser.get('lastName')  || '',
      username:  parseUser.get('username')  || '',
    };
    maybeTouchLastActiveAt(req.user.id);
    next();
  } catch (err) {
    console.error('[auth] session validation error:', err.message);
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
};
