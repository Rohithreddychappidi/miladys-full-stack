import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from '../data/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const { token, user } = await api.login({ email, password });
    setToken(token);
    setUser(user);
    return user;
  }

  async function signup(payload) {
    const { token, user } = await api.signup(payload);
    setToken(token);
    setUser(user);
    return user;
  }

  async function forgotPassword(email) {
    return api.forgotPassword({ email });
  }

  async function resetPassword(token, newPassword) {
    const { token: authToken, user } = await api.resetPassword({ token, newPassword });
    setToken(authToken);
    setUser(user);
    return user;
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, forgotPassword, resetPassword, isAdmin: !!user?.isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
