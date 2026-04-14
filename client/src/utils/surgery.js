export function getTotalGrafts(surgery) {
  const entries = surgery?.extraction?.entries ?? [];
  return entries.reduce((sum, e) => sum + (e.count ?? 0), 0);
}

export function getGoalPct(surgery) {
  const total = getTotalGrafts(surgery);
  const goal = surgery?.graftGoal || 0;
  if (!goal) return '—';
  return `${Math.round((total / goal) * 100)}%`;
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString([], { dateStyle: 'medium' });
}

export function formatDateMmDdYyyy(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const y = d.getFullYear();
  return `${m}/${day}/${y}`;
}

export function formatStartedAt(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
  const date = d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  return `${time} | ${date}`;
}

export function formatElapsedMs(ms) {
  if (ms == null || ms < 0) return '—';
  const hrs = Math.floor(ms / 3600000);
  const min = Math.floor((ms % 3600000) / 60000);
  if (hrs > 0) return `${hrs}hrs ${min}min`;
  return `${min}min`;
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
      const th = a.payload.totalHairs ?? 0;
      const ih = a.payload.intactHairs ?? 0;
      rec.graftCount += 1;
      rec.totalHairs += th;
      rec.totalIntact += ih;
      if (ih < (th || 1)) rec.transectedGrafts += 1;
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
    m.set(a.payload.label, (m.get(a.payload.label) || 0) + 1);
  }
  const graftTypes = graftButtons.length
    ? graftButtons.map((b) => b.label)
    : [...labelSet].sort();
  return { byTech, graftTypes, techIds: [...techIds] };
}

/** Report stats derived from extraction.entries */
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
