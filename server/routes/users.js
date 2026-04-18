const router = require('express').Router();
const { Parse } = require('../parse');
const authenticate = require('../middleware/auth');
const { requireOwnerOrDoctor } = require('../middleware/roles');
const { toId } = require('../middleware/accountScope');
const normalizeRoles = require('../lib/normalizeRoles');

const TEAM_ROLES = ['accountOwner', 'technician', 'doctor', 'user']; // 'user' kept for backward compat

/** Fields needed for team tables — avoids loading full User rows from Mongo. */
const TEAM_LIST_SELECT = [
  'firstName',
  'lastName',
  'username',
  'email',
  'roles',
  'lastActiveAt',
  'accountId',
];

const TEAM_LIST_LIMIT = 500;

function toJSON(user) {
  const { password, sessionToken, authData, ...rest } = user.toJSON();
  return { id: user.id, ...rest };
}

async function findTeamUsersForAccount(aid) {
  const query = new Parse.Query(Parse.User);
  query.equalTo('accountId', aid);
  query.containedIn('roles', TEAM_ROLES);
  query.ascending('firstName');
  query.limit(TEAM_LIST_LIMIT);
  query.select(...TEAM_LIST_SELECT);
  const users = await query.find({ useMasterKey: true });
  return users.map(toJSON);
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
    const r0 = normalizeRoles(req.user?.roles);
    const accountId = r0.includes('admin') && req.query.accountId
      ? req.query.accountId
      : req.user.accountId;
    const aid = toId(accountId);
    if (!aid) return res.status(403).json({ error: 'Forbidden' });
    const users = await findTeamUsersForAccount(aid);
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/users[?role=...][?accountId=] — list team members; admin may pass accountId
router.get('/', async (req, res) => {
  try {
    const r = normalizeRoles(req.user?.roles);
    const accountId = r.includes('admin') && req.query.accountId
      ? req.query.accountId
      : req.user.accountId;
    const aid = toId(accountId);
    if (!aid) return res.status(403).json({ error: 'Forbidden' });
    if (!r.includes('admin') && !r.includes('accountOwner') && !r.includes('doctor')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const users = await findTeamUsersForAccount(aid);
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.use(requireOwnerOrDoctor);

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
    const sameAccount = toId(req.user.accountId) === userAid;
    const isClinicLead =
      sameAccount &&
      (req.user.roles?.includes('accountOwner') || req.user.roles?.includes('doctor'));
    const scopeHeader = req.headers['x-scope-account-id']?.trim();
    const isAdminScoped = req.user.roles?.includes('admin') && scopeHeader && scopeHeader === userAid;
    if (!isClinicLead && !isAdminScoped) return res.status(403).json({ error: 'Forbidden' });
    const targetRoles = user.get('roles') || [];
    if (
      targetRoles.includes('accountOwner') &&
      !req.user.roles?.includes('accountOwner') &&
      !req.user.roles?.includes('admin')
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }
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
    if (toId(user.get('accountId')) !== toId(req.user.accountId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const targetRoles = user.get('roles') || [];
    if (
      targetRoles.includes('accountOwner') &&
      !req.user.roles?.includes('accountOwner') &&
      !req.user.roles?.includes('admin')
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await user.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 101) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
