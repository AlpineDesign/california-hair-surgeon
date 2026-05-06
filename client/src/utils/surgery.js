/**
 * Merge a partial surgery payload from the API into existing client state.
 * Activity endpoints return slim surgery (no patient / graftButtons hydration).
 */
export function mergeSurgeryPatch(prev, patch) {
  if (patch == null) return prev ?? null;
  return prev ? { ...prev, ...patch } : patch;
}

/**
 * Total grafts from surgery.extraction.entries (rollup on the Surgery document).
 * Used for list/progress rows where activities are not loaded — keeps payloads small.
 * Bench counting updates entries in lockstep with ActivityLog on each click.
 */
export function getTotalGrafts(surgery) {
  const entries = surgery?.extraction?.entries ?? [];
  return entries.reduce((sum, e) => sum + (e.count ?? 0), 0);
}

/**
 * Grafts extracted toward the goal — uses the higher of rollup (`extraction.entries`) and
 * API `extractionGraftCount` (ActivityLog row count, aligned with GET /activities). Max covers
 * entries vs log drift in either direction.
 */
export function getGraftProgressCurrent(surgery) {
  const fromEntries = getTotalGrafts(surgery);
  const n = surgery?.extractionGraftCount;
  if (typeof n !== 'number' || Number.isNaN(n) || n < 0) return fromEntries;
  return Math.max(fromEntries, n);
}

export function getGoalPct(surgery) {
  const total = getGraftProgressCurrent(surgery);
  const goal = surgery?.graftGoal || 0;
  if (!goal) return '—';
  return `${Math.round((total / goal) * 100)}%`;
}

/** Parse Server JSON often encodes dates as `{ __type: 'Date', iso: '...' }` instead of a string. */
function toJsDate(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'object' && value.__type === 'Date' && typeof value.iso === 'string') {
    const d = new Date(value.iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDateTime(dateStr) {
  const d = toJsDate(dateStr);
  if (!d) return '—';
  return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatDate(dateStr) {
  const d = toJsDate(dateStr);
  if (!d) return '—';
  return d.toLocaleDateString([], { dateStyle: 'medium' });
}

export function formatDateMmDdYyyy(dateStr) {
  const d = toJsDate(dateStr);
  if (!d) return null;
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const y = d.getFullYear();
  return `${m}/${day}/${y}`;
}

export function formatStartedAt(dateStr) {
  const d = toJsDate(dateStr);
  if (!d) return '—';
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
  const date = d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  return `${time} | ${date}`;
}

/** Elapsed duration for live timers: `hours:minutes`, minutes zero-padded (e.g. `2:05`, `429:23`). */
export function formatElapsedMs(ms) {
  if (ms == null || ms < 0) return '—';
  const hrs = Math.floor(ms / 3600000);
  const min = Math.floor((ms % 3600000) / 60000);
  return `${hrs}:${String(min).padStart(2, '0')}`;
}

/**
 * Elapsed ms for a phase (extraction/placement) with pause/resume support.
 * - startedAt: when phase first started (never changes)
 * - completedAt: when last stopped (null = currently running)
 * - accumulatedElapsedMs: total elapsed across run segments
 * - resumedAt: when last resumed (null = first run or stopped)
 */
export function getPhaseElapsedMs(phase) {
  if (!phase?.startedAt) return 0;
  const accumulated = phase.accumulatedElapsedMs ?? 0;
  const completed = !!phase.completedAt;
  const resumedAt = phase.resumedAt;
  if (completed) {
    if (accumulated > 0 || phase.accumulatedElapsedMs != null) return accumulated;
    return phase.completedAt ? new Date(phase.completedAt).getTime() - new Date(phase.startedAt).getTime() : 0;
  }
  if (resumedAt) {
    return accumulated + (Date.now() - new Date(resumedAt).getTime());
  }
  return Date.now() - new Date(phase.startedAt).getTime();
}

export function formatElapsedForReport(ms) {
  if (ms == null || ms < 0) return null;
  const hrs = Math.floor(ms / 3600000);
  const min = Math.floor((ms % 3600000) / 60000);
  return `${String(hrs).padStart(2, '0')} H : ${String(min).padStart(2, '0')} M`;
}

export function formatReportDateTime(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatReportTime(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function getSurgeryTotalMs(surgery) {
  if (!surgery?.startedAt || !surgery?.completedAt) return null;
  return new Date(surgery.completedAt).getTime() - new Date(surgery.startedAt).getTime();
}

export function getTechnicianDisplayName(user) {
  if (!user) return '—';
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return name || user.username || '—';
}

const GRAFT_LABEL_FRACTION_RE = /^(\d+)\s*\/\s*(\d+)$/;

/** Parse numerator/denominator from a graft button label "a/b", or from intact/total hairs. */
export function parseGraftFractionFromButton(btn) {
  const label = (btn?.label || '').trim();
  const m = GRAFT_LABEL_FRACTION_RE.exec(label);
  if (m) {
    return { num: parseInt(m[1], 10), den: parseInt(m[2], 10) };
  }
  const th = Number(btn?.totalHairs);
  const ih = Number(btn?.intactHairs);
  const den = Number.isFinite(th) && th > 0 ? th : 1;
  const num = Number.isFinite(ih) ? ih : 0;
  return { num, den };
}

/**
 * Tech counting grid: one row per denominator (graft type); within each row, numerator descending.
 */
export function groupGraftButtonsByDenominatorRows(buttons) {
  if (!buttons?.length) return [];
  const parsed = buttons.map((btn) => ({ btn, ...parseGraftFractionFromButton(btn) }));
  const byDen = new Map();
  for (const p of parsed) {
    const d = p.den;
    if (!byDen.has(d)) byDen.set(d, []);
    byDen.get(d).push(p);
  }
  const dens = [...byDen.keys()].sort((a, b) => a - b);
  return dens.map((d) =>
    byDen
      .get(d)
      .sort((a, b) => b.num - a.num)
      .map((p) => p.btn),
  );
}

/** Flat list in graft-type order (pickers, modals, chip rows). */
export function sortGraftButtonsByGraftType(buttons) {
  return groupGraftButtonsByDenominatorRows(buttons).flat();
}

/** User id string from an activity log row (Pointer or string in JSON). */
export function getActivityUserId(a) {
  if (!a) return null;
  const u = a.userId;
  return (
    u?.id ??
    u?.objectId ??
    (typeof u === 'string' ? u : null) ??
    a.user?.id ??
    null
  );
}

/**
 * surgery.technicianIds from the API may be plain strings or pointer-shaped objects.
 */
export function getTechnicianIdStrings(surgery) {
  const raw = surgery?.technicianIds || [];
  return raw
    .map((t) => (typeof t === 'string' ? t : t?.objectId ?? t?.id ?? null))
    .filter(Boolean);
}

export function getSelectedTechnicians(technicians, surgery) {
  const idSet = new Set(getTechnicianIdStrings(surgery));
  return (technicians || []).filter((t) => idSet.has(t.id || t.objectId));
}

/**
 * Columns for the completed-surgery report: assigned techs first, then activity-only users
 * (names from activity.user when missing from the technicians list).
 */
export function getReportTechnicianColumns(technicians, surgery, activities, techIdsFromActivities = []) {
  const assigned = getSelectedTechnicians(technicians, surgery);
  const seen = new Set(assigned.map((t) => t.id || t.objectId).filter(Boolean));
  const cols = [...assigned];
  for (const uid of techIdsFromActivities) {
    if (!uid || seen.has(uid)) continue;
    seen.add(uid);
    const fromList = (technicians || []).find((t) => (t.id || t.objectId) === uid);
    if (fromList) {
      cols.push(fromList);
      continue;
    }
    const act = (activities || []).find((a) => getActivityUserId(a) === uid);
    const u = act?.user;
    cols.push({
      id: uid,
      objectId: uid,
      firstName: u?.firstName ?? '',
      lastName: u?.lastName ?? '',
      username: u?.username ?? '—',
    });
  }
  return cols;
}

export function getExtractionEntries(surgery, options = {}) {
  const graftButtons = surgery?.graftButtons ?? options?.graftButtons ?? [];
  const existingEntries = surgery?.extraction?.entries ?? [];
  if (graftButtons.length > 0) {
    return graftButtons.map((btn) => {
      const found = existingEntries.find((e) => e.label === btn.label);
      return { ...btn, count: found?.count ?? 0 };
    });
  }
  return existingEntries.map((e) => ({ ...e, count: e.count ?? 0 }));
}

const ACTIVITY_EXTRACTION_BULK_MAX = 500;

/** Graft units for one extraction activity (bulk rows use payload.count). */
export function getActivityExtractionBulkCount(payload) {
  if (!payload || payload.count == null) return 1;
  const n = Number(payload.count);
  if (!Number.isInteger(n) || n < 1) return 1;
  return Math.min(n, ACTIVITY_EXTRACTION_BULK_MAX);
}

/**
 * Aggregate activities by userId to produce per-technician stats.
 * activities: [{ userId, action, payload }]
 * Returns Map<userId, { graftCount, hairCount, potHair, transRateHair, transRateGrafts }>
 */
export function getTechnicianStatsFromActivities(activities) {
  const byUser = new Map();
  for (const a of activities || []) {
    const uid = getActivityUserId(a);
    if (!uid) continue;
    if (!byUser.has(uid)) {
      byUser.set(uid, { graftCount: 0, totalHairs: 0, totalIntact: 0, transectedGrafts: 0 });
    }
    const rec = byUser.get(uid);
    if (a.action === 'extraction' && a.payload?.label != null) {
      const units = getActivityExtractionBulkCount(a.payload);
      const th = a.payload.totalHairs ?? 0;
      const ih = a.payload.intactHairs ?? 0;
      rec.graftCount += units;
      rec.totalHairs += th * units;
      rec.totalIntact += ih * units;
      if (ih < (th || 1)) rec.transectedGrafts += units;
    }
  }
  const result = new Map();
  for (const [uid, rec] of byUser) {
    const transectedHairs = rec.totalHairs - rec.totalIntact;
    result.set(uid, {
      graftCount: rec.graftCount,
      hairCount: rec.totalIntact,
      potHair: rec.totalHairs,
      transRateHair: rec.totalHairs ? ((transectedHairs / rec.totalHairs) * 100) : 0,
      transRateGrafts: rec.graftCount ? ((rec.transectedGrafts / rec.graftCount) * 100) : 0,
    });
  }
  return result;
}

/** Per-technician stats row for the logged-in user (tries id and objectId — Parse keys vary). */
export function getTechnicianStatsRowForUser(technicianStats, user) {
  if (!technicianStats || !user) return {};
  for (const k of [user.id, user.objectId].filter(Boolean)) {
    if (technicianStats.has(k)) return technicianStats.get(k);
  }
  return {};
}

/** Value from a Map keyed by user id (e.g. byTech) for the logged-in user. */
export function getMapValueForUser(map, user) {
  if (!map || !user) return undefined;
  for (const k of [user.id, user.objectId].filter(Boolean)) {
    if (map.has(k)) return map.get(k);
  }
  return undefined;
}

/**
 * Pooled extraction stats from the activity log (same rules as per-technician aggregation).
 * Includes every extraction activity with a label, even if userId is missing — use for report
 * "Total" rows/cards so they match the click log, not only surgery.extraction.entries.
 */
export function getAggregateExtractionStatsFromActivities(activities) {
  let graftCount = 0;
  let totalHairs = 0;
  let totalIntact = 0;
  let transectedGrafts = 0;
  let singleGrafts = 0;
  for (const a of activities || []) {
    if (a.action !== 'extraction' || a.payload?.label == null) continue;
    const units = getActivityExtractionBulkCount(a.payload);
    const th = a.payload.totalHairs ?? 0;
    const ih = a.payload.intactHairs ?? 0;
    graftCount += units;
    totalHairs += th * units;
    totalIntact += ih * units;
    if (ih < (th || 1)) transectedGrafts += units;
    if (a.payload.label === '1/1') singleGrafts += units;
  }
  const transectedHairs = totalHairs - totalIntact;
  return {
    graftCount,
    hairCount: totalIntact,
    potHair: totalHairs,
    transRateHair: totalHairs ? (transectedHairs / totalHairs) * 100 : 0,
    transRateGrafts: graftCount ? (transectedGrafts / graftCount) * 100 : 0,
    singleGrafts,
  };
}

/**
 * Per-technician, per-graft-type counts from extraction activities.
 * Returns { byTech: Map<userId, Map<label, count>>, graftTypes: string[], techIds: string[] }
 */
export function getGraftCountsByTechnician(activities, graftButtons = []) {
  const byTech = new Map();
  const labelSet = new Set();
  const techIds = new Set();
  for (const a of activities || []) {
    const uid = getActivityUserId(a);
    if (!uid || a.action !== 'extraction' || !a.payload?.label) continue;
    techIds.add(uid);
    labelSet.add(a.payload.label);
    if (!byTech.has(uid)) byTech.set(uid, new Map());
    const m = byTech.get(uid);
    const units = getActivityExtractionBulkCount(a.payload);
    m.set(a.payload.label, (m.get(a.payload.label) || 0) + units);
  }
  // Include every label seen in activities, not only current graftButtons (labels can differ after option changes).
  const buttonOrder = graftButtons.map((b) => b.label).filter(Boolean);
  const extraFromActivities = [...labelSet].filter((l) => !buttonOrder.includes(l)).sort();
  const graftTypes = buttonOrder.length
    ? [...buttonOrder, ...extraFromActivities]
    : [...labelSet].sort();
  return { byTech, graftTypes, techIds: [...techIds] };
}

/**
 * Per–graft-type extraction counts from the activity log only (all technicians, all clicks).
 * Prefer this for report row totals when activities are loaded so totals match per-tech cells.
 */
export function getExtractionCountsByLabel(activities) {
  const m = new Map();
  for (const a of activities || []) {
    if (a.action !== 'extraction' || a.payload?.label == null) continue;
    const lbl = a.payload.label;
    const units = getActivityExtractionBulkCount(a.payload);
    m.set(lbl, (m.get(lbl) || 0) + units);
  }
  return m;
}

/**
 * Graft-type row labels for report tables: preserves button/activity order but omits types with zero extractions.
 */
export function getGraftTypeLabelsForReport(graftTypes, entries, extractionCountByLabel) {
  const order = graftTypes.length
    ? graftTypes
    : entries?.length
      ? entries.map((e) => e.label).filter(Boolean)
      : [...extractionCountByLabel.keys()].sort();
  return order.filter((label) => (extractionCountByLabel.get(label) ?? 0) > 0);
}

/**
 * Report stats from extraction.entries (surgery rollup). Prefer
 * getAggregateExtractionStatsFromActivities when activities are available for UI that must
 * match the click log.
 */
export function getReportStats(surgery) {
  const entries = surgery?.extraction?.entries ?? [];
  const totalGrafts = entries.reduce((s, e) => s + (e.count ?? 0), 0);
  const totalHairs = entries.reduce((s, e) => s + (e.count ?? 0) * (e.totalHairs ?? 0), 0);
  const totalIntact = entries.reduce((s, e) => s + (e.count ?? 0) * (e.intactHairs ?? 0), 0);
  const transectedHairs = totalHairs - totalIntact;
  const hairTransectionRate = totalHairs ? transectedHairs / totalHairs : 0;
  const graftTransectionRate = totalGrafts
    ? entries
        .filter((e) => (e.intactHairs ?? 0) < (e.totalHairs ?? 1))
        .reduce((s, e) => s + (e.count ?? 0), 0) / totalGrafts
    : 0;
  const singleGrafts = entries
    .filter((e) => e.label === '1/1')
    .reduce((s, e) => s + (e.count ?? 0), 0);
  return {
    totalGrafts,
    totalHairs,
    totalIntact,
    transectedHairs,
    hairTransectionRate,
    graftTransectionRate,
    singleGrafts,
  };
}
