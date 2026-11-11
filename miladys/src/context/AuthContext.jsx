import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken, askOtherTabsForSession, onSessionEnded } from '../data/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Signed out from another tab, or the admin sign-in ran out on the server.
    const signedOut = () => setUser(null);
    onSessionEnded(signedOut);
    window.addEventListener('miladys:admin-signed-out', signedOut);
    (async () => {
      // An admin tab opened from another admin tab picks up its sign-in.
      const token = getToken() || (await askOtherTabsForSession());
      if (!token) return;
      try {
        const { user } = await api.me();
        if (!cancelled) setUser(user);
      } catch {
        setToken(null, { silent: true });
      }
    })().finally(() => { if (!cancelled) setLoading(false); });
    return () => {
      cancelled = true;
      window.removeEventListener('miladys:admin-signed-out', signedOut);
    };
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

  async function googleLogin(credential) {
    const { token, user, needsMobile } = await api.googleLogin({ credential });
    setToken(token);
    setUser(user);
    return { user, needsMobile };
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

  // Admin: after a password change / question reset the server hands back a
  // fresh sign-in (every other session is signed out).
  function adoptSession(token, user) {
    setToken(token, { silent: true });
    setUser(user);
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, googleLogin, logout, forgotPassword, resetPassword, adoptSession, isAdmin: !!user?.isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
