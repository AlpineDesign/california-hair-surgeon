const router = require('express').Router();
const { Parse } = require('../parse');
const authenticate = require('../middleware/auth');
const normalizeRoles = require('../lib/normalizeRoles');
const { toId } = require('../middleware/accountScope');
const config = require('../config');

const Account = Parse.Object.extend('Account');
const ActivityLog = Parse.Object.extend('ActivityLog');
const Surgery = Parse.Object.extend('Surgery');
const Patient = Parse.Object.extend('Patient');
const Option = Parse.Object.extend('Option');
const AccountSettings = Parse.Object.extend('AccountSettings');

async function destroyInBatches(classCtor, applyConstraints, batchSize = 200) {
  for (;;) {
    const q = new Parse.Query(classCtor);
    applyConstraints(q);
    q.limit(batchSize);
    const batch = await q.find({ useMasterKey: true });
    if (!batch.length) break;
    await Parse.Object.destroyAll(batch, { useMasterKey: true });
  }
}

/**
 * Removes all app data for an account (ActivityLog, surgeries, patients, options, users, account).
 * Intended for /app-tests cleanup only; requires ENABLE_APP_TEST_HARNESS on the server.
 */
async function purgeAccount(accountId) {
  const aid = toId(accountId);
  if (!aid) throw new Error('Invalid accountId');

  await destroyInBatches(ActivityLog, (q) => q.equalTo('accountId', aid));
  await destroyInBatches(Surgery, (q) => q.equalTo('accountId', aid));
  await destroyInBatches(Patient, (q) => q.equalTo('accountId', aid));
  await destroyInBatches(Option, (q) => q.equalTo('accountId', aid));
  try {
    await destroyInBatches(AccountSettings, (q) => q.equalTo('accountId', aid));
  } catch {
    /* class may be absent in some deployments */
  }

  await destroyInBatches(
    Parse.User,
    (q) => q.equalTo('accountId', aid),
    50,
  );

  const acc = await new Parse.Query(Account).get(aid, { useMasterKey: true });
  await acc.destroy({ useMasterKey: true });
}

router.post('/purge-account', authenticate, async (req, res) => {
  if (!config.enableAppTestHarness) {
    return res.status(404).json({
      error: 'App test harness disabled. Start the server with ENABLE_APP_TEST_HARNESS=1',
    });
  }
  const roles = normalizeRoles(req.user?.roles);
  if (!roles.includes('accountOwner')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const aid = toId(req.user.accountId);
  if (!aid) return res.status(400).json({ error: 'No account' });
  try {
    await purgeAccount(aid);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Purge failed' });
  }
});

module.exports = router;
module.exports.purgeAccount = purgeAccount;
