const router = require('express').Router();
const { Parse } = require('../parse');
const authenticate = require('../middleware/auth');
const normalizeRoles = require('../lib/normalizeRoles');
const rolesMw = require('../middleware/roles');
const requireOwnerOrDoctor = rolesMw.requireOwnerOrDoctor;
const isBenchTechnician = rolesMw.isBenchTechnician;

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

function sumExtractionEntryCounts(entries) {
  return (entries || []).reduce((a, e) => a + (Number(e.count) || 0), 0);
}

/** Rollup graft total from surgery.extraction.entries (same source as the completed report). */
function graftTotalFromSurgeryParseObject(s) {
  const ext = s.get('extraction') || {};
  return sumExtractionEntryCounts(ext.entries);
}

async function getSurgeryForAccess(id, req) {
  const surgery = await new Parse.Query(Surgery).get(id, { useMasterKey: true });
  if (!surgery) return null;
  const isAdmin = req.user.roles?.includes('admin');
  if (isAdmin) return surgery;
  const surgeryAccountId = toId(surgery.get('accountId'));
  const userAccountId = toId(req.user.accountId);
  if (!surgeryAccountId || !userAccountId || surgeryAccountId !== userAccountId) return null;
  return surgery;
}

/**
 * Extraction rows in ActivityLog for a surgery — same notion as GET /activities (all techs, extraction only).
 * Uses OR(string id, Pointer) because legacy rows may store surgeryId as a string or as a Surgery pointer;
 * a single equalTo often only matches one shape and undercounts (e.g. 327 vs 1127).
 */
async function getExtractionGraftCountForSurgeryId(surgeryId) {
  try {
    const ptr = Surgery.createWithoutData(surgeryId);
    const qStr = new Parse.Query(ActivityLog);
    qStr.equalTo('surgeryId', surgeryId);
    qStr.equalTo('action', 'extraction');
    const qPtr = new Parse.Query(ActivityLog);
    qPtr.equalTo('surgeryId', ptr);
    qPtr.equalTo('action', 'extraction');
    return await Parse.Query.or(qStr, qPtr).count({ useMasterKey: true });
  } catch (err) {
    console.error('ActivityLog compound count failed; using string surgeryId only', err);
    const q = new Parse.Query(ActivityLog);
    q.equalTo('surgeryId', surgeryId);
    q.equalTo('action', 'extraction');
    return q.count({ useMasterKey: true });
  }
}

const EXTRACTION_COUNT_BATCH = 20;

async function getExtractionGraftCountsBySurgeryIds(surgeryIds, surgeryObjects) {
  if (!surgeryIds.length) return {};
  const map = {};
  const list = surgeryObjects?.length ? surgeryObjects : null;
  if (list) {
    for (let i = 0; i < list.length; i += EXTRACTION_COUNT_BATCH) {
      const chunk = list.slice(i, i + EXTRACTION_COUNT_BATCH);
      await Promise.all(
        chunk.map(async (s) => {
          const logCount = await getExtractionGraftCountForSurgeryId(s.id);
          const fromEntries = graftTotalFromSurgeryParseObject(s);
          map[s.id] = Math.max(logCount, fromEntries);
        }),
      );
    }
    return map;
  }
  for (let i = 0; i < surgeryIds.length; i += EXTRACTION_COUNT_BATCH) {
    const chunk = surgeryIds.slice(i, i + EXTRACTION_COUNT_BATCH);
    await Promise.all(
      chunk.map(async (id) => {
        map[id] = await getExtractionGraftCountForSurgeryId(id);
      }),
    );
  }
  return map;
}

async function surgeryJsonWithExtractionGraftCount(surgery) {
  const json = toJSON(surgery);
  const logCount = await getExtractionGraftCountForSurgeryId(surgery.id);
  const fromEntries = sumExtractionEntryCounts(json.extraction?.entries);
  json.extractionGraftCount = Math.max(logCount, fromEntries);
  return json;
}

/** Bench tech: append user to technicianIds once they participate (activity or button prefs). */
function mergeTechnicianIfMissing(surgery, userId) {
  const raw = surgery.get('technicianIds') || [];
  const ids = raw.map((t) => toId(t)).filter(Boolean);
  if (ids.includes(userId)) return;
  const uRef = Parse.User.createWithoutData(userId);
  surgery.set('technicianIds', [...raw, uRef]);
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
    query.limit(1000);
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

    const graftCounts = await getExtractionGraftCountsBySurgeryIds(
      results.map((s) => s.id),
      results,
    );
    const surgeries = results.map((s) => {
      const base = {
        ...toJSON(s),
        patient: patientMap[toId(s.get('patientId'))] || null,
        extractionGraftCount: graftCounts[s.id] ?? 0,
      };
      if (req.user.roles?.includes('admin') && accountMap[toId(s.get('accountId'))]) {
        base.account = accountMap[s.get('accountId')];
      }
      return base;
    });

    res.json(surgeries);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/surgeries
router.post('/', requireOwnerOrDoctor, async (req, res) => {
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

// GET /api/surgeries/:id/activities — bench techs see only their rows; owner/admin/doctor see all
router.get('/:id/activities', async (req, res) => {
  try {
    const surgery = await getSurgeryForAccess(req.params.id, req);
    if (!surgery) return res.status(404).json({ error: 'Not found' });
    const filterToOwn = isBenchTechnician(req);
    const query = new Parse.Query(ActivityLog);
    query.equalTo('surgeryId', surgery.id);
    if (filterToOwn) query.equalTo('userId', req.user.id);
    query.descending('createdAt');
    // Per-tech report aggregates every click; a 200 cap truncated long cases and made summaries incomplete.
    query.limit(50000);
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
    if (isBenchTechnician(req) && surgery.get('status') !== 'active') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { action, payload } = req.body;
    if (action !== 'extraction') {
      return res.status(400).json({ error: 'action must be extraction' });
    }
    const activity = new ActivityLog();
    activity.set('surgeryId', surgery.id);
    activity.set('userId', req.user.id);
    activity.set('accountId', toId(surgery.get('accountId')));
    activity.set('action', action);
    activity.set('payload', payload || {});
    await activity.save(null, { useMasterKey: true });
    const ext = surgery.get('extraction') || {};
    if (payload?.label != null) {
      const newExt = applyExtractionDelta(ext, payload, 1);
      if (!ext.startedAt) newExt.startedAt = new Date().toISOString();
      surgery.set('extraction', newExt);
    }
    if (isBenchTechnician(req)) mergeTechnicianIfMissing(surgery, req.user.id);
    await surgery.save(null, { useMasterKey: true });
    // Omit withPatient/withGraftButtons — client already has them; saves two DB round-trips per click.
    res.status(201).json({
      activity: toJSON(activity),
      surgery: await surgeryJsonWithExtractionGraftCount(surgery),
    });
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
    if (isBenchTechnician(req) && surgery.get('status') !== 'active') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const activity = await new Parse.Query(ActivityLog).get(req.params.activityId, { useMasterKey: true });
    if (!activity || toId(activity.get('surgeryId')) !== surgery.id) return res.status(404).json({ error: 'Not found' });
    const { payload: newPayload } = req.body;
    const oldPayload = activity.get('payload') || {};
    const action = activity.get('action');
    if (action !== 'extraction') {
      return res.status(400).json({ error: 'Only extraction activities can be edited' });
    }
    const ext = surgery.get('extraction') || {};
    surgery.set('extraction', applyExtractionDelta(ext, oldPayload, -1));
    if (newPayload?.label) {
      const afterUndo = surgery.get('extraction') || {};
      surgery.set('extraction', applyExtractionDelta(afterUndo, newPayload, 1));
    }
    activity.set('payload', newPayload || oldPayload);
    await activity.save(null, { useMasterKey: true });
    await surgery.save(null, { useMasterKey: true });
    res.json({
      activity: toJSON(activity),
      surgery: await surgeryJsonWithExtractionGraftCount(surgery),
    });
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
    if (isBenchTechnician(req) && surgery.get('status') !== 'active') {
      return res.status(403).json({ error: 'Forbidden' });
    }
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
    res.json({ surgery: await surgeryJsonWithExtractionGraftCount(surgery) });
  } catch (err) {
    if (err.code === 101) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/surgeries/:id
// ?light=1 — surgery fields only (no patient, no graft list). Polling / fast shell.
// ?omitGrafts=1 — patient hydrated, graft list omitted (dashboard uses /api/settings/options).
router.get('/:id', async (req, res) => {
  try {
    const query = new Parse.Query(Surgery);
    const surgery = await query.get(req.params.id, { useMasterKey: true });
    const isAdmin = normalizeRoles(req.user?.roles).includes('admin');
    if (!isAdmin && toId(surgery.get('accountId')) !== toId(req.user.accountId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const json = await surgeryJsonWithExtractionGraftCount(surgery);
    const light = req.query.light === '1' || req.query.light === 'true';
    const omitGrafts = req.query.omitGrafts === '1' || req.query.omitGrafts === 'true';
    if (light) {
      res.json(json);
      return;
    }
    const withP = await withPatient(json);
    if (omitGrafts) {
      res.json(withP);
      return;
    }
    res.json(await withGraftButtons(withP));
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
    if (!req.user.roles?.includes('admin') && toId(surgery.get('accountId')) !== toId(req.user.accountId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    /** Bench-tech button prefs only — skip patient/graft hydration in response (saves 2+ DB round trips). */
    let benchTechButtonConfigOnly = false;
    if (isBenchTechnician(req)) {
      const allowed = Object.keys(req.body);
      if (allowed.length !== 1 || allowed[0] !== 'technicianButtonConfigs') {
        return res.status(403).json({ error: 'Technicians can only update their button configuration' });
      }
      const configs = req.body.technicianButtonConfigs;
      if (!Array.isArray(configs)) return res.status(400).json({ error: 'technicianButtonConfigs must be an array' });
      const cfgToId = (c) => (typeof c.userId === 'string' ? c.userId : (c.userId?.objectId ?? c.userId?.id ?? ''));
      const myEntry = configs.find((c) => cfgToId(c) === req.user.id);
      if (!myEntry || !Array.isArray(myEntry.labels)) {
        return res.status(400).json({ error: 'Must include your own config with labels array' });
      }
      const existing = surgery.get('technicianButtonConfigs') || [];
      const merged = existing.filter((c) => cfgToId(c) !== req.user.id);
      merged.push({ userId: req.user.id, labels: myEntry.labels });
      surgery.set('technicianButtonConfigs', merged);
      req.body = { technicianButtonConfigs: merged };
      mergeTechnicianIfMissing(surgery, req.user.id);
      benchTechButtonConfigOnly = true;
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
    if (benchTechButtonConfigOnly) {
      res.json(toJSON(surgery));
      return;
    }
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
    if (!req.user.roles.includes('admin') && toId(surgery.get('accountId')) !== toId(req.user.accountId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await surgery.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 101) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/surgeries/:id/extraction — timer updates only; light JSON (no patient/graft hydration).
router.post('/:id/extraction', async (req, res) => {
  try {
    const surgery = await getSurgeryForAccess(req.params.id, req);
    if (!surgery) return res.status(404).json({ error: 'Not found' });
    const existing = surgery.get('extraction') || {};
    surgery.set('extraction', { ...existing, ...req.body });
    await surgery.save(null, { useMasterKey: true });
    res.json(toJSON(surgery));
  } catch (err) {
    if (err.code === 101) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/surgeries/:id/placement — same as extraction timer route.
router.post('/:id/placement', async (req, res) => {
  try {
    const surgery = await getSurgeryForAccess(req.params.id, req);
    if (!surgery) return res.status(404).json({ error: 'Not found' });
    const existing = surgery.get('placement') || {};
    surgery.set('placement', { ...existing, ...req.body });
    await surgery.save(null, { useMasterKey: true });
    res.json(toJSON(surgery));
  } catch (err) {
    if (err.code === 101) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
