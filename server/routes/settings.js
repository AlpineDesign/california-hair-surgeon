const router = require('express').Router();
const { Parse } = require('../parse');
const authenticate = require('../middleware/auth');
const requireRole  = require('../middleware/roles');
const { getGraftButtonsForAccount, saveGraftButtonsForAccount } = require('./options');

const Account = Parse.Object.extend('Account');
const Option  = Parse.Object.extend('Option');

const OPTION_TYPES = ['hairType', 'hairColor', 'hairCaliber', 'skinColor', 'fueDevice', 'fueTipStyle', 'fueTipSize', 'holdingSolution', 'placingDevice'];

function toJSON(obj) {
  return { id: obj.id, ...obj.toJSON() };
}

router.use(authenticate, requireRole('accountOwner'));

// GET /api/settings — account branding + owner profile
router.get('/', async (req, res) => {
  try {
    const query = new Parse.Query(Account);
    const account = await query.get(req.user.accountId, { useMasterKey: true });
    res.json(toJSON(account));
  } catch (err) {
    if (err.code === 101) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/settings
router.patch('/', async (req, res) => {
  try {
    const query = new Parse.Query(Account);
    const account = await query.get(req.user.accountId, { useMasterKey: true });
    Object.entries(req.body).forEach(([k, v]) => account.set(k, v));
    await account.save(null, { useMasterKey: true });
    res.json(toJSON(account));
  } catch (err) {
    if (err.code === 101) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/settings/options — Option entities by type + graftButtons from Option table
router.get('/options', async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const result = {};
    const optQuery = new Parse.Query(Option);
    optQuery.equalTo('accountId', accountId);
    optQuery.containedIn('type', OPTION_TYPES);
    optQuery.ascending('sortOrder');
    optQuery.ascending('label');
    const options = await optQuery.find({ useMasterKey: true });
    OPTION_TYPES.forEach((t) => {
      result[t + 's'] = options.filter((o) => o.get('type') === t).map(toJSON);
    });
    result.graftButtons = await getGraftButtonsForAccount(accountId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/settings/options — only graftButtons (stored in Option table)
router.patch('/options', async (req, res) => {
  try {
    if (req.body.graftButtons !== undefined) {
      await saveGraftButtonsForAccount(req.user.accountId, req.body.graftButtons);
    }
    const result = {};
    const accountId = req.user.accountId;
    const optQuery = new Parse.Query(Option);
    optQuery.equalTo('accountId', accountId);
    optQuery.containedIn('type', OPTION_TYPES);
    optQuery.ascending('sortOrder');
    optQuery.ascending('label');
    const options = await optQuery.find({ useMasterKey: true });
    OPTION_TYPES.forEach((t) => {
      result[t + 's'] = options.filter((o) => o.get('type') === t).map(toJSON);
    });
    result.graftButtons = await getGraftButtonsForAccount(accountId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
