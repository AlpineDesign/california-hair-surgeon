// Returns middleware that checks req.user.roles includes the required role.
// Always use .includes() — roles is an array, never a single string.

/**
 * Remote / tech-dash users (technician or legacy `user` role).
 * Not accountOwner, admin, or doctor — doctors use the dashboard and see account-wide surgeries.
 */
function isBenchTechnician(req) {
  const r = req.user?.roles || [];
  if (r.includes('accountOwner') || r.includes('admin') || r.includes('doctor')) return false;
  return r.includes('technician') || r.includes('user');
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user?.roles?.includes(role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

module.exports = requireRole;
module.exports.isBenchTechnician = isBenchTechnician;
