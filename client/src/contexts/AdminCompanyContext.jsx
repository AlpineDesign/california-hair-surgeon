import { createContext, useContext } from 'react';

const AdminCompanyContext = createContext(null);

export function AdminCompanyProvider({ accountId, practiceName, children }) {
  return (
    <AdminCompanyContext.Provider value={{ accountId, practiceName }}>
      {children}
    </AdminCompanyContext.Provider>
  );
}

/**
 * When inside AdminCompanyLayout (viewing a company as admin), returns { accountId, practiceName }.
 * Otherwise returns null — use user.accountId in that case.
 */
export function useAdminCompany() {
  return useContext(AdminCompanyContext);
}
