const router = require('express').Router();
const { Parse } = require('../parse');
const authenticate = require('../middleware/auth');
const requireRole  = require('../middleware/roles');

const GlobalDefaults = Parse.Object.extend('GlobalDefaults');

function toJSON(obj) {
  return { id: obj.id, ...obj.toJSON() };
}

router.use(authenticate, requireRole('admin'));

// GET /api/defaults — single GlobalDefaults document
router.get('/', async (req, res) => {
  try {
    const query = new Parse.Query(GlobalDefaults);
    const defaults = await query.first({ useMasterKey: true });
    res.json(defaults ? toJSON(defaults) : {});
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/defaults
router.patch('/', async (req, res) => {
  try {
    const query = new Parse.Query(GlobalDefaults);
    let defaults = await query.first({ useMasterKey: true });
    if (!defaults) {
      defaults = new GlobalDefaults();
    }
    Object.entries(req.body).forEach(([k, v]) => defaults.set(k, v));
    await defaults.save(null, { useMasterKey: true });
    res.json(toJSON(defaults));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
