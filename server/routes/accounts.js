const router = require('express').Router();
const { Parse } = require('../parse');
const authenticate = require('../middleware/auth');
const requireRole  = require('../middleware/roles');
const { resolveScopedAccount } = require('../middleware/accountScope');

const Account = Parse.Object.extend('Account');

function toJSON(obj) {
  return { id: obj.id, ...obj.toJSON() };
}

router.use(authenticate);

// ── Account owner: update own account ────────────────────────────────────────

// PATCH /api/accounts/mine — own clinic or admin with X-Scope-Account-Id
router.patch('/mine', resolveScopedAccount, async (req, res) => {
  try {
    const query = new Parse.Query(Account);
    const account = await query.get(req.scopedAccountId, { useMasterKey: true });
    Object.entries(req.body).forEach(([k, v]) => account.set(k, v));
    await account.save(null, { useMasterKey: true });
    res.json(toJSON(account));
  } catch (err) {
    if (err.code === 101) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/accounts/logo — upload logo, returns { url }
router.post('/logo', resolveScopedAccount, async (req, res) => {
  try {
    const { base64, name, type } = req.body;
    if (!base64 || !name) return res.status(400).json({ error: 'base64 and name required' });

    const file = new Parse.File(name, { base64 }, type || 'image/png');
    await file.save({ useMasterKey: true });
    const url = file.url();

    // Persist on the account
    const query = new Parse.Query(Account);
    const account = await query.get(req.scopedAccountId, { useMasterKey: true });
    account.set('logoUrl', url);
    await account.save(null, { useMasterKey: true });

    res.json({ url });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Admin-only routes ─────────────────────────────────────────────────────────

router.use(requireRole('admin'));

const { seedAccountFromDefaults } = require('../lib/seedAccount');

// POST /api/accounts/with-owner — create Account + User (accountOwner), seed from defaults
router.post('/with-owner', async (req, res) => {
  try {
    const { practiceName, username, password, firstName, lastName, email } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const user = new Parse.User();
    user.set('username', username);
    user.set('password', password);
    user.set('firstName', firstName || '');
    user.set('lastName', lastName || '');
    if (email) user.set('email', email);
    user.set('roles', ['accountOwner']);
    await user.signUp(null, { useMasterKey: true });

    const account = new Account();
    account.set('ownerId', user.id);
    if (practiceName) account.set('practiceName', practiceName);
    await account.save(null, { useMasterKey: true });

    const freshUser = await new Parse.Query(Parse.User).get(user.id, { useMasterKey: true });
    freshUser.set('accountId', account.id);
    await freshUser.save(null, { useMasterKey: true });

    await seedAccountFromDefaults(account.id);

    res.status(201).json({
      account: toJSON(account),
      user: { id: user.id, username, firstName: firstName || '', lastName: lastName || '', email: email || '' },
    });
  } catch (err) {
    const msg = err.code === 202 ? 'Username already taken' : (err.message || 'Failed to create clinic');
    res.status(err.code === 202 ? 409 : 500).json({ error: msg });
  }
});

// GET /api/accounts — includes technicianCount, doctorCount, lastActivity
router.get('/', async (req, res) => {
  try {
    const query = new Parse.Query(Account);
    query.descending('createdAt');
    const accounts = await query.find({ useMasterKey: true });
    const accountIds = accounts.map((a) => a.id);

    const User = Parse.User;
    const ActivityLog = Parse.Object.extend('ActivityLog');

    const [users, recentActivities] = await Promise.all([
      accountIds.length
        ? new Parse.Query(User).containedIn('accountId', accountIds).find({ useMasterKey: true })
        : [],
      accountIds.length
        ? new Parse.Query(ActivityLog)
            .containedIn('accountId', accountIds)
            .descending('createdAt')
            .limit(500)
            .find({ useMasterKey: true })
        : [],
    ]);

    const techCount = {};
    const doctorCount = {};
    accountIds.forEach((id) => { techCount[id] = 0; doctorCount[id] = 0; });
    const toId = (ref) => (ref && (ref.id || ref.objectId || (typeof ref === 'string' ? ref : null))) || null;

    users.forEach((u) => {
      const aid = toId(u.get('accountId'));
      if (!aid) return;
      const roles = u.get('roles') || [];
      if (roles.includes('technician') || roles.includes('user')) techCount[aid] = (techCount[aid] || 0) + 1;
      if (roles.includes('doctor')) doctorCount[aid] = (doctorCount[aid] || 0) + 1;
    });

    const lastActivity = {};
    recentActivities.forEach((a) => {
      const aid = toId(a.get('accountId'));
      if (aid) {
        const at = a.get('createdAt');
        if (at && (lastActivity[aid] == null || at > lastActivity[aid])) lastActivity[aid] = at;
      }
    });

    const result = accounts.map((a) => {
      const j = toJSON(a);
      j.technicianCount = techCount[a.id] ?? 0;
      j.doctorCount = doctorCount[a.id] ?? 0;
      j.lastActivity = lastActivity[a.id] ? new Date(lastActivity[a.id]).toISOString() : null;
      return j;
    });
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/accounts/:id
router.get('/:id', async (req, res) => {
  try {
    const query = new Parse.Query(Account);
    const account = await query.get(req.params.id, { useMasterKey: true });
    res.json(toJSON(account));
  } catch (err) {
    if (err.code === 101) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/accounts
router.post('/', async (req, res) => {
  try {
    const account = new Account();
    Object.entries(req.body).forEach(([k, v]) => account.set(k, v));
    await account.save(null, { useMasterKey: true });
    res.status(201).json(toJSON(account));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/accounts/:id
router.patch('/:id', async (req, res) => {
  try {
    const query = new Parse.Query(Account);
    const account = await query.get(req.params.id, { useMasterKey: true });
    Object.entries(req.body).forEach(([k, v]) => account.set(k, v));
    await account.save(null, { useMasterKey: true });
    res.json(toJSON(account));
  } catch (err) {
    if (err.code === 101) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/accounts/:id
router.delete('/:id', async (req, res) => {
  try {
    const query = new Parse.Query(Account);
    const account = await query.get(req.params.id, { useMasterKey: true });
    await account.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 101) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
