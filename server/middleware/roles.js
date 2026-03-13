// Returns middleware that checks req.user.roles includes the required role.
// Always use .includes() — roles is an array, never a single string.
module.exports = function requireRole(role) {
  return (req, res, next) => {
    if (!req.user?.roles?.includes(role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};
