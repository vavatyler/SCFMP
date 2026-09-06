import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { getCooperative, listCooperatives } from '../api/cooperatives';
import { ACTIVE_ORGANIZATION_STORAGE_KEY } from '../config/organizationContext';

const CooperativeContext = createContext(null);

const savedOrganizationId = () => {
  const saved = Number(localStorage.getItem(ACTIVE_ORGANIZATION_STORAGE_KEY));
  return Number.isInteger(saved) && saved > 0 ? saved : null;
};

export const CooperativeProvider = ({ children }) => {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [cooperatives, setCooperatives] = useState([]);
  const [activeCooperativeId, setActiveCooperativeId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  const isSuperAdmin = user?.role === 'super_admin';

  const selectCooperative = useCallback((nextId) => {
    const normalizedId = Number(nextId);
    const authorizedId = Number.isInteger(normalizedId)
      && cooperatives.some((cooperative) => cooperative.id === normalizedId)
      ? normalizedId
      : null;
    setActiveCooperativeId(authorizedId);
    if (authorizedId) localStorage.setItem(ACTIVE_ORGANIZATION_STORAGE_KEY, String(authorizedId));
    else localStorage.removeItem(ACTIVE_ORGANIZATION_STORAGE_KEY);
  }, [cooperatives]);

  const fetchCooperatives = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setCooperatives([]);
      setActiveCooperativeId(null);
      setLoadError('');
      setIsLoading(false);
      localStorage.removeItem(ACTIVE_ORGANIZATION_STORAGE_KEY);
      return;
    }

    const persistedId = savedOrganizationId();
    // Authorization discovery must never carry a stale persisted organization header.
    localStorage.removeItem(ACTIVE_ORGANIZATION_STORAGE_KEY);
    setIsLoading(true);
    setLoadError('');
    setActiveCooperativeId(null);
    try {
      const data = isSuperAdmin
        ? await listCooperatives()
        : user.cooperative_id
          ? [await getCooperative(user.cooperative_id)]
          : [];
      const activeOrganizations = data.filter((organization) => organization.status !== 'inactive' && organization.status !== 'suspended');
      const restoredId = activeOrganizations.some((organization) => organization.id === persistedId)
        ? persistedId
        : null;
      setCooperatives(activeOrganizations);
      setActiveCooperativeId(restoredId);
      if (restoredId) localStorage.setItem(ACTIVE_ORGANIZATION_STORAGE_KEY, String(restoredId));
    } catch {
      setCooperatives([]);
      setActiveCooperativeId(null);
      setLoadError('organizationsLoadError');
      localStorage.removeItem(ACTIVE_ORGANIZATION_STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, isSuperAdmin, user]);

  useEffect(() => { fetchCooperatives(); }, [fetchCooperatives]);

  const activeCooperative = cooperatives.find((cooperative) => cooperative.id === activeCooperativeId) || null;
  const requestOrganizationSelection = useCallback(() => setIsSelectorOpen(true), []);
  const cooperativeScope = useMemo(
    () => (activeCooperative ? { cooperative_id: activeCooperative.id } : {}),
    [activeCooperative]
  );

  return (
    <CooperativeContext.Provider
      value={{
        cooperatives,
        activeCooperativeId,
        activeCooperative,
        cooperativeScope,
        hasOrganizationContext: Boolean(activeCooperative),
        isSuperAdmin,
        isLoading: isAuthLoading || isLoading,
        loadError,
        isSelectorOpen,
        setIsSelectorOpen,
        requestOrganizationSelection,
        selectCooperative,
        setActiveCooperativeId: selectCooperative,
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
