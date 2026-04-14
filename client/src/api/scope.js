/** Set from AdminCompanyLayout when an admin is viewing a clinic — axios adds X-Scope-Account-Id. */
let scopeAccountId = null;

export function setApiScopeAccountId(id) {
  scopeAccountId = id || null;
}

export function getApiScopeAccountId() {
  return scopeAccountId;
}
