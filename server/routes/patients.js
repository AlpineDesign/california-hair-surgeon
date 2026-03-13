const router = require('express').Router();
const { Parse } = require('../parse');
const authenticate = require('../middleware/auth');
const requireRole  = require('../middleware/roles');

const Patient = Parse.Object.extend('Patient');
const Surgery = Parse.Object.extend('Surgery');

function toJSON(obj) {
  return { id: obj.id, ...obj.toJSON() };
}

router.use(authenticate);

// GET /api/patients — admin may pass ?accountId= to view another account
router.get('/', async (req, res) => {
  try {
    const query = new Parse.Query(Patient);
    const accountId = req.user.roles?.includes('admin') && req.query.accountId
      ? req.query.accountId
      : req.user.accountId;
    if (!accountId) return res.status(403).json({ error: 'Forbidden' });
    query.equalTo('accountId', accountId);
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
    if (!req.user.roles.includes('admin') && patient.get('accountId') !== req.user.accountId) {
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

// POST /api/patients
router.post('/', requireRole('accountOwner'), async (req, res) => {
  try {
    const patient = new Patient();
    patient.set({ ...req.body, accountId: req.user.accountId });
    await patient.save(null, { useMasterKey: true });
    res.status(201).json(toJSON(patient));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/patients/:id
router.patch('/:id', requireRole('accountOwner'), async (req, res) => {
  try {
    const query = new Parse.Query(Patient);
    const patient = await query.get(req.params.id, { useMasterKey: true });
    if (patient.get('accountId') !== req.user.accountId) return res.status(403).json({ error: 'Forbidden' });
    Object.entries(req.body).forEach(([k, v]) => patient.set(k, v));
    await patient.save(null, { useMasterKey: true });
    res.json(toJSON(patient));
  } catch (err) {
    if (err.code === 101) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/patients/:id
router.delete('/:id', requireRole('accountOwner'), async (req, res) => {
  try {
    const query = new Parse.Query(Patient);
    const patient = await query.get(req.params.id, { useMasterKey: true });
    if (patient.get('accountId') !== req.user.accountId) return res.status(403).json({ error: 'Forbidden' });
    await patient.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 101) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
