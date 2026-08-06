import { createContext, useContext, useState, useEffect } from 'react';
import * as authApi from '../api/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // On first load, restore the session from localStorage if a token exists
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('scfmp_access_token');
      const savedUser = localStorage.getItem('scfmp_user');

      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          // Verify the token is still valid and refresh the user's details
          const freshUser = await authApi.getProfile();
          setUser(freshUser);
          localStorage.setItem('scfmp_user', JSON.stringify(freshUser));
        } catch {
          // Token invalid/expired and refresh failed — clear the stale session
          localStorage.removeItem('scfmp_access_token');
          localStorage.removeItem('scfmp_refresh_token');
          localStorage.removeItem('scfmp_user');
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    restoreSession();
  }, []);

  const login = async (email, password) => {
    const { user: loggedInUser, accessToken, refreshToken } = await authApi.login(email, password);

    localStorage.setItem('scfmp_access_token', accessToken);
    localStorage.setItem('scfmp_refresh_token', refreshToken);
    localStorage.setItem('scfmp_user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);

    return loggedInUser;
  };

  const logout = () => {
    localStorage.removeItem('scfmp_access_token');
    localStorage.removeItem('scfmp_refresh_token');
    localStorage.removeItem('scfmp_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
