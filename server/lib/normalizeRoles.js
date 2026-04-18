/** Parse `User.roles` may be an array, string, or JSON string — normalize before `.includes()`. */
const CANONICAL_ROLE = {
  admin: 'admin',
  accountowner: 'accountOwner',
  doctor: 'doctor',
  technician: 'technician',
  user: 'user',
};

function canonicalize(roleStr) {
  const s = String(roleStr).trim();
  const key = s.toLowerCase();
  return CANONICAL_ROLE[key] ?? s;
}

module.exports = function normalizeRoles(raw) {
  if (raw == null || raw === '') return [];
  let list;
  if (Array.isArray(raw)) {
    list = raw.filter((x) => x != null && x !== '').map(String);
  } else if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return [];
    if (t.startsWith('[')) {
      try {
        const p = JSON.parse(t);
        if (Array.isArray(p)) list = p.map(String).filter(Boolean);
        else list = [t];
      } catch (_) {
        list = [t];
      }
    } else if (t.includes(',')) {
      list = t.split(',').map((s) => s.trim()).filter(Boolean);
    } else {
      list = [t];
    }
  } else if (typeof raw === 'object' && raw !== null) {
    list = Object.values(raw).filter((v) => v != null && typeof v !== 'object').map(String);
  } else {
    return [];
  }
  return list.map(canonicalize);
};
