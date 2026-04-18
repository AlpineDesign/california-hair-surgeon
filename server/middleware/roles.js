// Returns middleware that checks req.user.roles includes the required role.
// Always use .includes() — roles is normalized to an array in auth middleware.

const normalizeRoles = require('../lib/normalizeRoles');
const { toId } = require('./accountScope');

/**
 * Remote / tech-dash users (technician or legacy `user` role).
 * Not accountOwner, admin, or doctor — doctors use the dashboard and see account-wide surgeries.
 */
function isBenchTechnician(req) {
  const r = normalizeRoles(req.user?.roles);
  if (r.includes('accountOwner') || r.includes('admin') || r.includes('doctor')) return false;
  return r.includes('technician') || r.includes('user');
}

function requireRole(role) {
  return (req, res, next) => {
    const r = normalizeRoles(req.user?.roles);
    if (!r.includes(role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

/** Owner, doctor, or other clinic staff (not bench technician / remote-only). */
function requireOwnerOrDoctor(req, res, next) {
  const r = normalizeRoles(req.user?.roles);
  if (r.includes('accountOwner') || r.includes('doctor')) return next();
  if (toId(req.user?.accountId) && !isBenchTechnician(req)) return next();
  return res.status(403).json({ error: 'Forbidden' });
}

module.exports = requireRole;
module.exports.requireOwnerOrDoctor = requireOwnerOrDoctor;
module.exports.isBenchTechnician = isBenchTechnician;
