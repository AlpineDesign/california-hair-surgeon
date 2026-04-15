const router = require('express').Router();
const { Parse } = require('../parse');
const authenticate = require('../middleware/auth');
const requireRole  = require('../middleware/roles');
const { toId } = require('../middleware/accountScope');

const TEAM_ROLES = ['accountOwner', 'technician', 'doctor', 'user']; // 'user' kept for backward compat

function toJSON(user) {
  const { password, sessionToken, authData, ...rest } = user.toJSON();
  return { id: user.id, ...rest };
}

router.use(authenticate);

// PATCH /api/users/me — update own profile (any authenticated user)
router.patch('/me', async (req, res) => {
  try {
    const { username, firstName, lastName, email, phone, password } = req.body;
    const query = new Parse.Query(Parse.User);
    const user = await query.get(req.user.id, { useMasterKey: true });
    if (username  !== undefined) user.set('username',  username);
    if (firstName !== undefined) user.set('firstName', firstName);
    if (lastName  !== undefined) user.set('lastName',  lastName);
    if (email     !== undefined) user.set('email',     email);
    if (phone     !== undefined) user.set('phone',     phone);
    if (password && typeof password === 'string' && password.trim()) user.set('password', password.trim());
    await user.save(null, { useMasterKey: true });
    res.json(toJSON(user));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/users/team — list team members; admin may pass ?accountId= to view another account
router.get('/team', async (req, res) => {
  try {
    const accountId = req.user.roles?.includes('admin') && req.query.accountId
      ? req.query.accountId
      : req.user.accountId;
    if (!accountId) return res.status(403).json({ error: 'Forbidden' });
    const query = new Parse.Query(Parse.User);
    query.equalTo('accountId', accountId);
    query.containedIn('roles', TEAM_ROLES);
    query.ascending('firstName');
    const users = await query.find({ useMasterKey: true });
    res.json(users.map(toJSON));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/users[?role=...][?accountId=] — list team members; admin may pass accountId
router.get('/', async (req, res) => {
  try {
    const accountId = req.user.roles?.includes('admin') && req.query.accountId
      ? req.query.accountId
      : req.user.accountId;
    if (!accountId) return res.status(403).json({ error: 'Forbidden' });
    if (!req.user.roles?.includes('admin') && !req.user.roles?.includes('accountOwner') && !req.user.roles?.includes('doctor')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const query = new Parse.Query(Parse.User);
    query.equalTo('accountId', accountId);
    query.containedIn('roles', TEAM_ROLES);
    query.ascending('firstName');
    const users = await query.find({ useMasterKey: true });
    res.json(users.map(toJSON));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.use(requireRole('accountOwner'));

// POST /api/users — create a team member (technician or doctor)
router.post('/', async (req, res) => {
  try {
    const { username, password, firstName, lastName, email, role } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const assignedRole = role === 'doctor' ? 'doctor' : 'technician';

    const user = new Parse.User();
    user.set('username',  username);
    user.set('password',  password);
    user.set('firstName', firstName || '');
    user.set('lastName',  lastName  || '');
    user.set('roles',     [assignedRole]);
    user.set('accountId', req.user.accountId);
    if (email) user.set('email', email);

    await user.signUp(null, { useMasterKey: true });
    res.status(201).json(toJSON(user));
  } catch (err) {
    const msg = err.code === 202 ? 'Username already taken' : (err.message || 'Failed to create user');
    res.status(409).json({ error: msg });
  }
});

// PATCH /api/users/:id — edit team member (incl. password reset by account owner); admin with X-Scope-Account-Id
router.patch('/:id', async (req, res) => {
  try {
    const query = new Parse.Query(Parse.User);
    const user = await query.get(req.params.id, { useMasterKey: true });
    const userAid = toId(user.get('accountId'));
    const isOwner = req.user.roles?.includes('accountOwner') && toId(req.user.accountId) === userAid;
    const scopeHeader = req.headers['x-scope-account-id']?.trim();
    const isAdminScoped = req.user.roles?.includes('admin') && scopeHeader && scopeHeader === userAid;
    if (!isOwner && !isAdminScoped) return res.status(403).json({ error: 'Forbidden' });
    const { firstName, lastName, username, email, role, password } = req.body;
    if (firstName !== undefined) user.set('firstName', firstName);
    if (lastName  !== undefined) user.set('lastName',  lastName);
    if (username  !== undefined) user.set('username',  username);
    if (email     !== undefined) user.set('email',     email);
    if (role === 'doctor' || role === 'technician') user.set('roles', [role]);
    if (password && typeof password === 'string' && password.trim()) user.set('password', password.trim());
    await user.save(null, { useMasterKey: true });
    res.json(toJSON(user));
  } catch (err) {
    if (err.code === 101) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  try {
    const query = new Parse.Query(Parse.User);
    const user = await query.get(req.params.id, { useMasterKey: true });
    if (user.get('accountId') !== req.user.accountId) return res.status(403).json({ error: 'Forbidden' });
    await user.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 101) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
