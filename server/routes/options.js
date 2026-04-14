/**
 * Option — per-account dropdown values (surgeons, tip styles, hair types, etc).
 * Referenced by ID from Patient and Surgery for filtering and consistency.
 *
 * Schema: { accountId, type, label, sortOrder }
 * type: 'hairType' | 'hairColor' | 'hairCaliber' | 'skinColor' |
 *       'fueDevice' | 'fueTipStyle' | 'fueTipSize' | 'holdingSolution' | 'placingDevice'
 */
const router = require('express').Router();
const { Parse } = require('../parse');
const authenticate = require('../middleware/auth');
const {
  resolveScopedAccount,
  getAccountIdFromRequest,
  toId,
} = require('../middleware/accountScope');

function requireOwnerOrAdminScoped(req, res, next) {
  const roles = req.user?.roles || [];
  if (!roles.includes('accountOwner') && !roles.includes('admin') && !roles.includes('doctor')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  return resolveScopedAccount(req, res, next);
}

const Option = Parse.Object.extend('Option');

const OPTION_TYPES = [
  'hairType', 'hairColor', 'hairCaliber', 'skinColor',
  'fueDevice', 'fueTipStyle', 'fueTipSize',
  'holdingSolution', 'placingDevice',
  'graftButton',
];

function toJSON(obj) {
  return { id: obj.id, ...obj.toJSON() };
}

router.use(authenticate);

// Map Option record to graft button shape { label, intactHairs, totalHairs, isDefault }
function optionToGraftButton(opt) {
  return {
    label: opt.get('label') || '',
    intactHairs: opt.get('intactHairs') ?? 0,
    totalHairs: opt.get('totalHairs') ?? 1,
    isDefault: !!opt.get('isDefault'),
  };
}

// GET /api/options — list options for current account, grouped by type
router.get('/', async (req, res) => {
  try {
    const accountId = getAccountIdFromRequest(req);
    if (!accountId) return res.json({});
    const query = new Parse.Query(Option);
    query.equalTo('accountId', accountId);
    query.containedIn('type', OPTION_TYPES);
    query.ascending('sortOrder');
    query.ascending('label');
    const options = await query.find({ useMasterKey: true });
    const grouped = OPTION_TYPES.filter((t) => t !== 'graftButton').reduce((acc, t) => {
      acc[t + 's'] = options.filter((o) => o.get('type') === t).map(toJSON);
      return acc;
    }, {});
    grouped.graftButtons = options
      .filter((o) => o.get('type') === 'graftButton')
      .sort((a, b) => (a.get('sortOrder') ?? 999) - (b.get('sortOrder') ?? 999))
      .map(optionToGraftButton);
    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.use(requireOwnerOrAdminScoped);

// POST /api/options — create option
router.post('/', async (req, res) => {
  try {
    const { type, label, sortOrder, intactHairs, totalHairs, isDefault } = req.body;
    if (!type || !OPTION_TYPES.includes(type) || !label?.trim()) {
      return res.status(400).json({ error: 'type and label required' });
    }
    let nextSortOrder = sortOrder;
    if (nextSortOrder === undefined || nextSortOrder === null) {
      const existing = await new Parse.Query(Option)
        .equalTo('accountId', req.scopedAccountId)
        .equalTo('type', type)
        .find({ useMasterKey: true });
      const maxOrder = existing.reduce((m, o) => Math.max(m, o.get('sortOrder') ?? 0), -1);
      nextSortOrder = maxOrder + 1;
    }
    const option = new Option();
    option.set('accountId', req.scopedAccountId);
    option.set('type', type);
    option.set('label', label.trim());
    option.set('sortOrder', nextSortOrder);
    if (type === 'graftButton') {
      option.set('intactHairs', intactHairs ?? 0);
      option.set('totalHairs', totalHairs ?? 1);
      option.set('isDefault', !!isDefault);
    }
    await option.save(null, { useMasterKey: true });
    res.status(201).json(type === 'graftButton' ? optionToGraftButton(option) : toJSON(option));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/options/:id
router.patch('/:id', async (req, res) => {
  try {
    const query = new Parse.Query(Option);
    const option = await query.get(req.params.id, { useMasterKey: true });
    const aid = option.get('accountId');
    if (toId(aid) !== toId(req.scopedAccountId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { label, sortOrder, intactHairs, totalHairs, isDefault } = req.body;
    if (label !== undefined) option.set('label', label.trim());
    if (sortOrder !== undefined) option.set('sortOrder', Number(sortOrder));
    if (option.get('type') === 'graftButton') {
      if (intactHairs !== undefined) option.set('intactHairs', Number(intactHairs));
      if (totalHairs !== undefined) option.set('totalHairs', Number(totalHairs));
      if (isDefault !== undefined) option.set('isDefault', !!isDefault);
    }
    await option.save(null, { useMasterKey: true });
    res.json(option.get('type') === 'graftButton' ? optionToGraftButton(option) : toJSON(option));
  } catch (err) {
    if (err.code === 101) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/options/:id
router.delete('/:id', async (req, res) => {
  try {
    const query = new Parse.Query(Option);
    const option = await query.get(req.params.id, { useMasterKey: true });
    if (toId(option.get('accountId')) !== toId(req.scopedAccountId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await option.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 101) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/options/reorder — batch update sortOrder
router.post('/reorder', async (req, res) => {
  try {
    const { type, ids } = req.body; // ids = [id1, id2, ...] in desired order
    if (!type || !OPTION_TYPES.includes(type) || !Array.isArray(ids)) {
      return res.status(400).json({ error: 'type and ids array required' });
    }
    const accountId = req.scopedAccountId;
    for (let i = 0; i < ids.length; i++) {
      const option = await new Parse.Query(Option).get(ids[i], { useMasterKey: true });
      if (toId(option.get('accountId')) !== toId(accountId) || option.get('type') !== type) continue;
      option.set('sortOrder', i);
      await option.save(null, { useMasterKey: true });
    }
    const query = new Parse.Query(Option);
    query.equalTo('accountId', accountId);
    query.equalTo('type', type);
    query.ascending('sortOrder');
    const options = await query.find({ useMasterKey: true });
    res.json(options.map(toJSON));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/options/migrate — create Option records from AccountSettings string arrays
router.post('/migrate', async (req, res) => {
  try {
    const accountId = req.scopedAccountId;
    if (!accountId) return res.status(403).json({ error: 'Forbidden' });

    const AccountSettings = Parse.Object.extend('AccountSettings');
    const settingsQuery = new Parse.Query(AccountSettings);
    settingsQuery.equalTo('accountId', accountId);
    const settings = await settingsQuery.first({ useMasterKey: true });
    if (!settings) return res.json({ migrated: 0, message: 'No AccountSettings found' });

    const typeToKey = {
      hairType: 'hairTypes', hairColor: 'hairColors', hairCaliber: 'hairCalibers', skinColor: 'skinColors',
      fueDevice: 'fueDevices', fueTipStyle: 'fueTipStyles', fueTipSize: 'fueTipSizes',
      holdingSolution: 'holdingSolutions', placingDevice: 'placingDevices',
    };
    let created = 0;
    for (const [optionType, settingsKey] of Object.entries(typeToKey)) {
      const labels = settings.get(settingsKey) || [];
      if (!Array.isArray(labels)) continue;
      const existing = await new Parse.Query(Option)
        .equalTo('accountId', accountId)
        .equalTo('type', optionType)
        .find({ useMasterKey: true });
      const existingLabels = new Set(existing.map((o) => o.get('label')));
      for (let i = 0; i < labels.length; i++) {
        const label = String(labels[i]).trim();
        if (!label || existingLabels.has(label)) continue;
        const opt = new Option();
        opt.set('accountId', accountId);
        opt.set('type', optionType);
        opt.set('label', label);
        opt.set('sortOrder', i);
        await opt.save(null, { useMasterKey: true });
        created++;
        existingLabels.add(label);
      }
    }
    // Also migrate graftButtons from AccountSettings to Option table
    const graftButtons = settings.get('graftButtons');
    if (Array.isArray(graftButtons) && graftButtons.length > 0) {
      await saveGraftButtonsForAccount(accountId, graftButtons);
      created += graftButtons.length;
      settings.unset('graftButtons');
      await settings.save(null, { useMasterKey: true });
    }
    res.json({ migrated: created, message: `Created ${created} options` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch graftButtons for an account (from Option table, fallback to GlobalDefaults)
async function getGraftButtonsForAccount(accountId) {
  const toId = (r) => (r == null ? null : typeof r === 'string' ? r : r?.objectId ?? r?.id ?? null);
  const aid = toId(accountId);
  if (!aid) return [];
  try {
    const Option = Parse.Object.extend('Option');
    const opts = await new Parse.Query(Option)
      .equalTo('accountId', aid)
      .equalTo('type', 'graftButton')
      .ascending('sortOrder')
      .ascending('label')
      .find({ useMasterKey: true });
    if (opts.length > 0) {
      return opts.map((o) => ({
        label: o.get('label') || '',
        intactHairs: o.get('intactHairs') ?? 0,
        totalHairs: o.get('totalHairs') ?? 1,
        isDefault: !!o.get('isDefault'),
      }));
    }
    const GlobalDefaults = Parse.Object.extend('GlobalDefaults');
    const defaults = await new Parse.Query(GlobalDefaults).first({ useMasterKey: true });
    const arr = defaults?.get('graftButtons') || [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// Save graftButtons array to Option table (replaces existing graftButton options)
async function saveGraftButtonsForAccount(accountId, graftButtons) {
  const toId = (r) => (r == null ? null : typeof r === 'string' ? r : r?.objectId ?? r?.id ?? null);
  const aid = toId(accountId);
  if (!aid) return;
  const Option = Parse.Object.extend('Option');
  const existing = await new Parse.Query(Option)
    .equalTo('accountId', aid)
    .equalTo('type', 'graftButton')
    .find({ useMasterKey: true });
  if (existing.length > 0) await Parse.Object.destroyAll(existing, { useMasterKey: true });
  if (!Array.isArray(graftButtons) || graftButtons.length === 0) return;
  // Dedupe by label (keep first) to prevent duplicates from ever persisting
  const seen = new Set();
  const deduped = graftButtons.filter((b) => {
    const lbl = (b.label || '').trim();
    if (!lbl || seen.has(lbl)) return false;
    seen.add(lbl);
    return true;
  });
  for (let i = 0; i < deduped.length; i++) {
    const b = deduped[i];
    const opt = new Option();
    opt.set('accountId', aid);
    opt.set('type', 'graftButton');
    opt.set('label', b.label || '');
    opt.set('sortOrder', i);
    opt.set('intactHairs', b.intactHairs ?? 0);
    opt.set('totalHairs', b.totalHairs ?? 1);
    opt.set('isDefault', !!b.isDefault);
    await opt.save(null, { useMasterKey: true });
  }
}

module.exports = router;
module.exports.OPTION_TYPES = OPTION_TYPES;
module.exports.getGraftButtonsForAccount = getGraftButtonsForAccount;
module.exports.saveGraftButtonsForAccount = saveGraftButtonsForAccount;
