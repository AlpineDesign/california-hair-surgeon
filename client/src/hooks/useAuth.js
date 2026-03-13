import { createContext, useContext, useState, useCallback } from 'react';
import { login as apiLogin, signup as apiSignup } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('surgassist_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback(async (username, password) => {
    const data = await apiLogin(username, password);
    setUser(data.user);
    localStorage.setItem('surgassist_user', JSON.stringify(data.user));
    return data.user;
  }, []);

  const signup = useCallback(async (payload) => {
    const data = await apiSignup(payload);
    setUser(data.user);
    localStorage.setItem('surgassist_user', JSON.stringify(data.user));
    return data.user;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('surgassist_user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
