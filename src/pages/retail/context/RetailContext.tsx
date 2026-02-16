import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { RetailStore, RetailShift } from '@/core/types/retail/retail';
import { retailService } from '@/core/services/retail/retailService';
import { useSession } from '@/core/security/session';

export type RetailMode = 'management' | 'operational';

interface RetailContextType {
  activeStore: RetailStore | null;
  activeShift: RetailShift | null;
  mode: RetailMode;
  isLoading: boolean;
  setMode: (mode: RetailMode) => void;
  setStore: (storeId: string) => void;
  refreshState: () => Promise<void>;
}

const RetailContext = createContext<RetailContextType | undefined>(undefined);

export const RetailProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const session = useSession();
  const [activeStore, setActiveStore] = useState<RetailStore | null>(null);
  const [activeShift, setActiveShift] = useState<RetailShift | null>(null);
  const [mode, setMode] = useState<RetailMode>('management');
  const [isLoading, setIsLoading] = useState(true);

  const refreshState = async () => {
    if (!session.tenantId) return;
    
    try {
      const stores = await retailService.listStores(session.tenantId);
      // Logic for determining active store
      if (stores.length > 0 && !activeStore) {
        setActiveStore(stores[0]);
      } else if (activeStore) {
        const current = stores.find(s => s.id === activeStore.id);
        if (current) setActiveStore(current);
      }

      const shifts = await retailService.listShifts(session.tenantId);
      const openShift = shifts.find(s => s.status === 'open' && s.employeeId === session.userId);
      setActiveShift(openShift || null);
    } catch (e) {
      console.error("[RetailContext] Refresh failed", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshState();
  }, [session.tenantId, session.userId]);

  const setStore = async (storeId: string) => {
    if (!session.tenantId) return;
    const store = await retailService.getStore(session.tenantId, storeId);
    if (store) setActiveStore(store);
  };

  return (
    <RetailContext.Provider value={{
      activeStore,
      activeShift,
      mode,
      isLoading,
      setMode,
      setStore,
      refreshState
    }}>
      {children}
    </RetailContext.Provider>
  );
};

export const useRetail = () => {
  const context = useContext(RetailContext);
  if (!context) throw new Error("useRetail must be used within a RetailProvider");
  return context;
};
