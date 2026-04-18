const router = require('express').Router();
const { Parse } = require('../parse');
const authenticate = require('../middleware/auth');
const { requireOwnerOrDoctor } = require('../middleware/roles');
const { toId } = require('../middleware/accountScope');
const normalizeRoles = require('../lib/normalizeRoles');

const Patient = Parse.Object.extend('Patient');
const Surgery = Parse.Object.extend('Surgery');

function toJSON(obj) {
  return { id: obj.id, ...obj.toJSON() };
}

router.use(authenticate);

// POST before GET /:id so `/` is never mistaken for a parameterized path.
// POST /api/patients
router.post('/', requireOwnerOrDoctor, async (req, res) => {
  try {
    const patient = new Patient();
    patient.set({ ...req.body, accountId: req.user.accountId });
    await patient.save(null, { useMasterKey: true });
    res.status(201).json(toJSON(patient));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/patients — admin may pass ?accountId= to view another account
router.get('/', async (req, res) => {
  try {
    const query = new Parse.Query(Patient);
    const r = normalizeRoles(req.user?.roles);
    const accountId = r.includes('admin') && req.query.accountId
      ? req.query.accountId
      : req.user.accountId;
    const aid = toId(accountId);
    if (!aid) return res.status(403).json({ error: 'Forbidden' });
    query.equalTo('accountId', aid);
    query.descending('createdAt');
    const results = await query.find({ useMasterKey: true });
    res.json(results.map(toJSON));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/patients/:id  — returns patient + surgery history
router.get('/:id', async (req, res) => {
  try {
    const query = new Parse.Query(Patient);
    const patient = await query.get(req.params.id, { useMasterKey: true });
    if (!normalizeRoles(req.user?.roles).includes('admin') && toId(patient.get('accountId')) !== toId(req.user.accountId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const sQuery = new Parse.Query(Surgery);
    sQuery.equalTo('patientId', patient.id);
    sQuery.descending('createdAt');
    const surgeries = await sQuery.find({ useMasterKey: true });
    res.json({ patient: toJSON(patient), surgeries: surgeries.map(toJSON) });
  } catch (err) {
    if (err.code === 101) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/patients/:id
router.patch('/:id', requireOwnerOrDoctor, async (req, res) => {
  try {
    const query = new Parse.Query(Patient);
    const patient = await query.get(req.params.id, { useMasterKey: true });
    if (toId(patient.get('accountId')) !== toId(req.user.accountId)) return res.status(403).json({ error: 'Forbidden' });
    Object.entries(req.body).forEach(([k, v]) => patient.set(k, v));
    await patient.save(null, { useMasterKey: true });
    res.json(toJSON(patient));
  } catch (err) {
    if (err.code === 101) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/patients/:id
router.delete('/:id', requireOwnerOrDoctor, async (req, res) => {
  try {
    const query = new Parse.Query(Patient);
    const patient = await query.get(req.params.id, { useMasterKey: true });
    if (toId(patient.get('accountId')) !== toId(req.user.accountId)) return res.status(403).json({ error: 'Forbidden' });
    await patient.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 101) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
