const router = require('express').Router();
const { Parse } = require('../parse');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const isBenchTechnician = requireRole.isBenchTechnician;

const Surgery = Parse.Object.extend('Surgery');
const Patient = Parse.Object.extend('Patient');
const ActivityLog = Parse.Object.extend('ActivityLog');

function toJSON(obj) {
  return { id: obj.id, ...obj.toJSON() };
}

function toId(ref) {
  if (ref == null) return null;
  if (typeof ref === 'string') return ref;
  return ref?.objectId ?? ref?.id ?? null;
}

async function getSurgeryForAccess(id, req) {
  const surgery = await new Parse.Query(Surgery).get(id, { useMasterKey: true });
  if (!surgery) return null;
  const isAdmin = req.user.roles?.includes('admin');
  const isAccountOwner = req.user.roles?.includes('accountOwner');
  if (isAdmin) return surgery;
  const surgeryAccountId = toId(surgery.get('accountId'));
  const userAccountId = toId(req.user.accountId);
  if (!surgeryAccountId || !userAccountId || surgeryAccountId !== userAccountId) return null;
  if (isBenchTechnician(req)) {
    const techIds = (surgery.get('technicianIds') || []).map((t) => toId(t)).filter(Boolean);
    if (!techIds.includes(req.user.id)) return null;
  }
  return surgery;
}

function applyExtractionDelta(extraction, entry, delta) {
  const ext = extraction || { entries: [] };
  const entries = [...(ext.entries || [])];
  const idx = entries.findIndex((e) => e.label === entry.label);
  const entryData = { label: entry.label, intactHairs: entry.intactHairs, totalHairs: entry.totalHairs };
  if (idx >= 0) {
    const newCount = Math.max(0, (entries[idx].count ?? 0) + delta);
    if (newCount === 0) entries.splice(idx, 1);
    else entries[idx] = { ...entries[idx], count: newCount };
  } else if (delta > 0) {
    entries.push({ ...entryData, count: delta });
  }
  return { ...ext, entries };
}

function applyPlacementDelta(placement, delta) {
  const plc = placement || { count: 0 };
  return { ...plc, count: Math.max(0, (plc.count ?? 0) + delta) };
}

const PATIENT_FIELDS = ['initials', 'dob', 'hairType', 'hairColor', 'hairCaliber', 'skinColor'];
function toPatientData(patient) {
  const o = { id: patient.id };
  PATIENT_FIELDS.forEach((f) => { o[f] = patient.get(f) ?? null; });
  return o;
}

async function withPatient(surgeryJson) {
  const rawId = surgeryJson.patientId;
  const id = typeof rawId === 'object' && rawId?.objectId ? rawId.objectId : (typeof rawId === 'string' ? rawId : null);
  if (!id) return surgeryJson;
  try {
    const patient = await new Parse.Query(Patient).get(id, { useMasterKey: true });
    return { ...surgeryJson, patientId: id, patient: toPatientData(patient) };
  } catch {
    return surgeryJson;
  }
}

function toAccountId(ref) {
  if (!ref) return null;
  if (typeof ref === 'string') return ref;
  return ref?.objectId ?? ref?.id ?? null;
}

async function withGraftButtons(surgeryJson) {
  const accountId = toAccountId(surgeryJson.accountId);
  if (!accountId) return surgeryJson;
  try {
    const { getGraftButtonsForAccount } = require('./options');
    const graftButtons = await getGraftButtonsForAccount(accountId);
    return { ...surgeryJson, graftButtons };
  } catch {
    return surgeryJson;
  }
}

router.use(authenticate);

// GET /api/surgeries[?patientId=xxx][?accountId=xxx]
// — Non-admin: always scoped to req.user.accountId.
// — Admin: default scoped to req.user.accountId (dashboard) unless ?all=1 (All Surgeries / global).
//   Optional ?accountId= narrows further (admin filters, per-clinic views).
router.get('/', async (req, res) => {
  try {
    const query = new Parse.Query(Surgery);
    const isAdmin = req.user.roles.includes('admin');
    const wantAll = isAdmin && (req.query.all === '1' || req.query.all === 'true');
    if (!isAdmin) {
      query.equalTo('accountId', req.user.accountId);
    } else if (wantAll) {
      if (req.query.accountId) query.equalTo('accountId', req.query.accountId);
    } else if (req.query.accountId) {
      query.equalTo('accountId', req.query.accountId);
    } else if (req.user.accountId) {
      query.equalTo('accountId', req.user.accountId);
    } else {
      return res.json([]);
    }
    if (req.query.patientId) {
      query.equalTo('patientId', req.query.patientId);
    }
    const surgicalFilters = ['doctorOptionId', 'surgeonId', 'fueDeviceId', 'fueTipStyleId', 'fueTipSizeId', 'holdingSolutionId', 'placingDeviceId'];
    if (req.user.roles?.includes('admin')) {
      surgicalFilters.forEach((key) => {
        const val = req.query[key];
        if (val) query.equalTo(`surgical.${key}`, val);
      });
    }
    query.descending('createdAt');
    const results = await query.find({ useMasterKey: true });

    const Patient = Parse.Object.extend('Patient');
    const toId = (ref) => (ref && (ref.id || ref.objectId || (typeof ref === 'string' ? ref : null))) || null;
    const patientIds = [...new Set(results.map((s) => toId(s.get('patientId'))).filter(Boolean))];
    let patientMap = {};
    if (patientIds.length) {
      const pQuery = new Parse.Query(Patient);
      pQuery.containedIn('objectId', patientIds);
      pQuery.limit(patientIds.length);
      const patients = await pQuery.find({ useMasterKey: true });
      patientMap = Object.fromEntries(patients.map((p) => [p.id, toPatientData(p)]));
    }

    let accountMap = {};
    if (req.user.roles?.includes('admin') && results.length) {
      const accountIds = [...new Set(results.map((s) => toId(s.get('accountId'))).filter(Boolean))];
      const Account = Parse.Object.extend('Account');
      const aQuery = new Parse.Query(Account);
      aQuery.containedIn('objectId', accountIds);
      const accounts = await aQuery.find({ useMasterKey: true });
      accountMap = Object.fromEntries(accounts.map((a) => [a.id, { id: a.id, practiceName: a.get('practiceName') }]));
    }

    let surgeries = results.map((s) => {
      const base = { ...toJSON(s), patient: patientMap[toId(s.get('patientId'))] || null };
      if (req.user.roles?.includes('admin') && accountMap[toId(s.get('accountId'))]) {
        base.account = accountMap[s.get('accountId')];
      }
      return base;
    });

    // Bench technicians only see surgeries they are assigned to
    if (isBenchTechnician(req)) {
      surgeries = surgeries.filter((s) => {
        const ids = (s.technicianIds || []).map((t) => t?.id ?? t?.objectId ?? (typeof t === 'string' ? t : null)).filter(Boolean);
        return ids.includes(req.user.id);
      });
    }

    res.json(surgeries);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/surgeries
router.post('/', requireRole('accountOwner'), async (req, res) => {
  try {
    const { patientId, surgical, graftGoal } = req.body;
    if (!patientId || typeof patientId !== 'string') {
      return res.status(400).json({ error: 'patientId is required' });
    }
    const surgery = new Surgery();
    surgery.set('patientId', patientId);
    surgery.set('surgical', surgical || {});
    if (graftGoal != null) surgery.set('graftGoal', Number(graftGoal));
    surgery.set('accountId', req.user.accountId);
    await surgery.save(null, { useMasterKey: true });
    res.status(201).json(await withGraftButtons(await withPatient(toJSON(surgery))));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Activity Log ──────────────────────────────────────────────────────────

// GET /api/surgeries/:id/activities — bench techs see own when assigned; owner/admin/doctor see all
router.get('/:id/activities', async (req, res) => {
  try {
    const surgery = await getSurgeryForAccess(req.params.id, req);
    if (!surgery) return res.status(404).json({ error: 'Not found' });
    const isAccountOwner = req.user.roles?.includes('accountOwner');
    const isAdmin = req.user.roles?.includes('admin');
    const technicianIds = (surgery.get('technicianIds') || []).map((t) => t?.id ?? t?.objectId ?? t);
    const filterToOwn = isBenchTechnician(req) && technicianIds.includes(req.user.id);
    const query = new Parse.Query(ActivityLog);
    query.equalTo('surgeryId', surgery.id);
    if (filterToOwn) query.equalTo('userId', req.user.id);
    query.descending('createdAt');
    query.limit(200);
    const results = await query.find({ useMasterKey: true });
    const userIds = [...new Set(results.map((r) => r.get('userId')).filter(Boolean))];
    let userMap = {};
    if (userIds.length) {
      const uQuery = new Parse.Query(Parse.User);
      uQuery.containedIn('objectId', userIds);
      const users = await uQuery.find({ useMasterKey: true });
      userMap = Object.fromEntries(users.map((u) => [u.id, { id: u.id, firstName: u.get('firstName'), lastName: u.get('lastName'), username: u.get('username') }]));
    }
    const activities = results.map((r) => {
      const json = toJSON(r);
      const uid = r.get('userId');
      json.user = uid ? userMap[uid] || null : null;
      return json;
    });
    res.json(activities);
  } catch (err) {
    if (err.code === 101) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/surgeries/:id/activities — create activity + update surgery
router.post('/:id/activities', async (req, res) => {
  try {
    const surgery = await getSurgeryForAccess(req.params.id, req);
    if (!surgery) return res.status(404).json({ error: 'Not found' });
    const { action, payload } = req.body;
    if (!action || !['extraction', 'placement'].includes(action)) {
      return res.status(400).json({ error: 'action must be extraction or placement' });
    }
    const activity = new ActivityLog();
    activity.set('surgeryId', surgery.id);
    activity.set('userId', req.user.id);
    activity.set('accountId', toId(surgery.get('accountId')));
    activity.set('action', action);
    activity.set('payload', payload || {});
    await activity.save(null, { useMasterKey: true });
    const ext = surgery.get('extraction') || {};
    const plc = surgery.get('placement') || {};
    if (action === 'extraction' && payload?.label != null) {
      const newExt = applyExtractionDelta(ext, payload, 1);
      if (!ext.startedAt) newExt.startedAt = new Date().toISOString();
      surgery.set('extraction', newExt);
    } else if (action === 'placement') {
      const newPlc = applyPlacementDelta(plc, 1);
      if (!plc.startedAt) newPlc.startedAt = new Date().toISOString();
      surgery.set('placement', newPlc);
    }
    await surgery.save(null, { useMasterKey: true });
    res.status(201).json({ activity: toJSON(activity), surgery: await withGraftButtons(await withPatient(toJSON(surgery))) });
  } catch (err) {
    if (err.code === 101) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/surgeries/:id/activities/:activityId — edit (correct error)
router.patch('/:id/activities/:activityId', async (req, res) => {
  try {
    const surgery = await getSurgeryForAccess(req.params.id, req);
    if (!surgery) return res.status(404).json({ error: 'Not found' });
    const activity = await new Parse.Query(ActivityLog).get(req.params.activityId, { useMasterKey: true });
    if (!activity || toId(activity.get('surgeryId')) !== surgery.id) return res.status(404).json({ error: 'Not found' });
    const { payload: newPayload } = req.body;
    const oldPayload = activity.get('payload') || {};
    const action = activity.get('action');
    const ext = surgery.get('extraction') || {};
    const plc = surgery.get('placement') || {};
    if (action === 'extraction') {
      surgery.set('extraction', applyExtractionDelta(ext, oldPayload, -1));
      if (newPayload?.label) {
        const afterUndo = surgery.get('extraction') || {};
        surgery.set('extraction', applyExtractionDelta(afterUndo, newPayload, 1));
      }
      activity.set('payload', newPayload || oldPayload);
    } else if (action === 'placement') {
      surgery.set('placement', applyPlacementDelta(plc, -1));
      activity.set('payload', newPayload || oldPayload);
      surgery.set('placement', applyPlacementDelta(surgery.get('placement'), 1));
    }
    await activity.save(null, { useMasterKey: true });
    await surgery.save(null, { useMasterKey: true });
    res.json({ activity: toJSON(activity), surgery: await withGraftButtons(await withPatient(toJSON(surgery))) });
  } catch (err) {
    if (err.code === 101) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/surgeries/:id/activities/:activityId — remove (reverse count)
router.delete('/:id/activities/:activityId', async (req, res) => {
  try {
    const surgery = await getSurgeryForAccess(req.params.id, req);
    if (!surgery) return res.status(404).json({ error: 'Not found' });
    const activity = await new Parse.Query(ActivityLog).get(req.params.activityId, { useMasterKey: true });
    if (!activity || toId(activity.get('surgeryId')) !== surgery.id) return res.status(404).json({ error: 'Not found' });
    const action = activity.get('action');
    const payload = activity.get('payload') || {};
    const ext = surgery.get('extraction') || {};
    const plc = surgery.get('placement') || {};
    if (action === 'extraction') surgery.set('extraction', applyExtractionDelta(ext, payload, -1));
    else if (action === 'placement') surgery.set('placement', applyPlacementDelta(plc, -1));
    await surgery.save(null, { useMasterKey: true });
    await activity.destroy({ useMasterKey: true });
    res.json({ surgery: await withGraftButtons(await withPatient(toJSON(surgery))) });
  } catch (err) {
    if (err.code === 101) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/surgeries/:id
router.get('/:id', async (req, res) => {
  try {
    const query = new Parse.Query(Surgery);
    const surgery = await query.get(req.params.id, { useMasterKey: true });
    if (!req.user.roles.includes('admin') && surgery.get('accountId') !== req.user.accountId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (isBenchTechnician(req)) {
      const techIds = (surgery.get('technicianIds') || []).map((t) => t?.id ?? t?.objectId ?? (typeof t === 'string' ? t : null)).filter(Boolean);
      if (!techIds.includes(req.user.id)) return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(await withGraftButtons(await withPatient(toJSON(surgery))));
  } catch (err) {
    if (err.code === 101) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/surgeries/:id
router.patch('/:id', async (req, res) => {
  try {
    const query = new Parse.Query(Surgery);
    const surgery = await query.get(req.params.id, { useMasterKey: true });
    if (!req.user.roles?.includes('admin') && surgery.get('accountId') !== req.user.accountId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const technicianIds = (surgery.get('technicianIds') || []).map((t) => t?.id ?? t?.objectId ?? (typeof t === 'string' ? t : null)).filter(Boolean);
    if (isBenchTechnician(req)) {
      if (!technicianIds.includes(req.user.id)) return res.status(403).json({ error: 'Forbidden' });
      const allowed = Object.keys(req.body);
      if (allowed.length !== 1 || allowed[0] !== 'technicianButtonConfigs') {
        return res.status(403).json({ error: 'Technicians can only update their button configuration' });
      }
      const configs = req.body.technicianButtonConfigs;
      if (!Array.isArray(configs)) return res.status(400).json({ error: 'technicianButtonConfigs must be an array' });
      const toId = (c) => (typeof c.userId === 'string' ? c.userId : (c.userId?.objectId ?? c.userId?.id ?? ''));
      const myEntry = configs.find((c) => toId(c) === req.user.id);
      if (!myEntry || !Array.isArray(myEntry.labels)) {
        return res.status(400).json({ error: 'Must include your own config with labels array' });
      }
      const existing = surgery.get('technicianButtonConfigs') || [];
      const merged = existing.filter((c) => toId(c) !== req.user.id);
      merged.push({ userId: req.user.id, labels: myEntry.labels });
      surgery.set('technicianButtonConfigs', merged);
      req.body = { technicianButtonConfigs: merged };
    }
    Object.entries(req.body).forEach(([k, v]) => surgery.set(k, v));
    // When starting surgery, ensure extraction and placement structures exist
    if (req.body.status === 'active') {
      const ext = surgery.get('extraction') || {};
      if (!Array.isArray(ext.entries)) {
        surgery.set('extraction', { ...ext, entries: ext.entries || [] });
      }
      const plc = surgery.get('placement') || {};
      if (plc.count === undefined) {
        surgery.set('placement', { ...plc, count: plc.count ?? 0 });
      }
    }
    await surgery.save(null, { useMasterKey: true });
    res.json(await withGraftButtons(await withPatient(toJSON(surgery))));
  } catch (err) {
    if (err.code === 101) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/surgeries/:id
router.delete('/:id', async (req, res) => {
  try {
    const query = new Parse.Query(Surgery);
    const surgery = await query.get(req.params.id, { useMasterKey: true });
    if (!req.user.roles.includes('admin') && surgery.get('accountId') !== req.user.accountId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await surgery.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 101) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/surgeries/:id/extraction
router.post('/:id/extraction', async (req, res) => {
  try {
    const query = new Parse.Query(Surgery);
    const surgery = await query.get(req.params.id, { useMasterKey: true });
    const existing = surgery.get('extraction') || {};
    surgery.set('extraction', { ...existing, ...req.body });
    await surgery.save(null, { useMasterKey: true });
    res.json(await withGraftButtons(await withPatient(toJSON(surgery))));
  } catch (err) {
    if (err.code === 101) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/surgeries/:id/placement
router.post('/:id/placement', async (req, res) => {
  try {
    const query = new Parse.Query(Surgery);
    const surgery = await query.get(req.params.id, { useMasterKey: true });
    const existing = surgery.get('placement') || {};
    surgery.set('placement', { ...existing, ...req.body });
    await surgery.save(null, { useMasterKey: true });
    res.json(await withGraftButtons(await withPatient(toJSON(surgery))));
  } catch (err) {
    if (err.code === 101) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
