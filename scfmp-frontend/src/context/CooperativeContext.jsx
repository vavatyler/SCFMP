import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { listCooperatives } from '../api/cooperatives';

const CooperativeContext = createContext(null);

export const CooperativeProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [cooperatives, setCooperatives] = useState([]);
  const [activeCooperativeId, setActiveCooperativeId] = useState(() => {
    const saved = localStorage.getItem('scfmp_active_cooperative_id');
    return saved ? Number(saved) : null;
  });
  const [isLoading, setIsLoading] = useState(false);

  const isSuperAdmin = user?.role === 'super_admin';

  const fetchCooperatives = useCallback(async () => {
    if (!isSuperAdmin) return;
    setIsLoading(true);
    try {
      const data = await listCooperatives();
      setCooperatives(data);
      setActiveCooperativeId((current) => {
        const stillValid = data.some((c) => c.id === current);
        return stillValid ? current : data[0]?.id || null;
      });
    } catch {
      // If this fails, pages will simply show "no cooperative selected" state
    } finally {
      setIsLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (isAuthenticated && isSuperAdmin) {
      fetchCooperatives();
    }
  }, [isAuthenticated, isSuperAdmin, fetchCooperatives]);

  useEffect(() => {
    if (activeCooperativeId) {
      localStorage.setItem('scfmp_active_cooperative_id', String(activeCooperativeId));
    }
  }, [activeCooperativeId]);

  // What every page should spread into its API params:
  // - super_admin: whichever cooperative is currently selected (or {} if none exist yet)
  // - everyone else: {} — the backend already scopes them to their own cooperative automatically
  const cooperativeScope =
    isSuperAdmin && activeCooperativeId ? { cooperative_id: activeCooperativeId } : {};

  const activeCooperative = cooperatives.find((c) => c.id === activeCooperativeId) || null;

  return (
    <CooperativeContext.Provider
      value={{
        cooperatives,
        activeCooperativeId,
        activeCooperative,
        setActiveCooperativeId,
        cooperativeScope,
        isSuperAdmin,
        isLoading,
        refetchCooperatives: fetchCooperatives,
      }}
    >
      {children}
    </CooperativeContext.Provider>
  );
};

export const useCooperative = () => {
  const context = useContext(CooperativeContext);
  if (!context) throw new Error('useCooperative must be used within a CooperativeProvider');
  return context;
};
