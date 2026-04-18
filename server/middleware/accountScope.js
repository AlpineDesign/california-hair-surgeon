/**
 * Resolves which Account document API calls apply to.
 * - X-Scope-Account-Id header: admin acting on a specific clinic (required for admin without accountOwner).
 * - Otherwise accountOwner uses req.user.accountId.
 */

const normalizeRoles = require('../lib/normalizeRoles');

function toId(ref) {
  if (ref == null) return null;
  if (typeof ref === 'string') return ref;
  return ref.id || ref.objectId || null;
}

/**
 * List/detail helpers: account id from header, else the user's own clinic.
 */
function getAccountIdFromRequest(req) {
  const headerId = req.headers['x-scope-account-id'];
  const trimmed = typeof headerId === 'string' ? headerId.trim() : '';
  if (trimmed) return trimmed;
  return toId(req.user?.accountId);
}

/**
 * Mutations: account owner OR admin with X-Scope-Account-Id.
 * Dual role: header wins when present; else accountOwner may use own accountId.
 */
function resolveScopedAccount(req, res, next) {
  const roles = normalizeRoles(req.user?.roles);
  const headerId = req.headers['x-scope-account-id'];
  const trimmed = typeof headerId === 'string' ? headerId.trim() : '';
  const aid = toId(req.user?.accountId);

  if (roles.includes('admin') && trimmed) {
    req.scopedAccountId = trimmed;
    return next();
  }
  if ((roles.includes('accountOwner') || roles.includes('doctor')) && aid) {
    req.scopedAccountId = aid;
    return next();
  }
  if (roles.includes('admin')) {
    return res.status(400).json({ error: 'X-Scope-Account-Id header required for admin' });
  }
  return res.status(403).json({ error: 'Forbidden' });
}

module.exports = {
  toId,
  getAccountIdFromRequest,
  resolveScopedAccount,
};
