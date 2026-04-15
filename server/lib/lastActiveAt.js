const { Parse } = require('../parse');

/** Persist last activity time on the User row (shown on Team list). */
async function touchLastActiveAt(userId) {
  if (!userId) return;
  try {
    const q = new Parse.Query(Parse.User);
    const u = await q.get(userId, { useMasterKey: true });
    u.set('lastActiveAt', new Date());
    await u.save(null, { useMasterKey: true });
  } catch (e) {
    console.error('[lastActiveAt] touch failed:', e.message);
  }
}

const TOUCH_INTERVAL_MS = 10 * 60 * 1000;
const lastTouchByUser = new Map();

/** At most one write per user per interval (avoids a DB write on every API call). */
function maybeTouchLastActiveAt(userId) {
  if (!userId) return;
  const now = Date.now();
  const prev = lastTouchByUser.get(userId) || 0;
  if (now - prev < TOUCH_INTERVAL_MS) return;
  lastTouchByUser.set(userId, now);
  setImmediate(() => touchLastActiveAt(userId));
}

module.exports = { touchLastActiveAt, maybeTouchLastActiveAt };
