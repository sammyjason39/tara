import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  RetailStore,
  RetailShift,
  RetailChannel,
} from "@/core/types/retail/retail";
import { retailService } from "@/core/services/retail/retailService";
import { useSession } from "@/core/security/session";
import { useAuth } from "@/contexts/AuthContext";

export type RetailMode = "management" | "operational";

interface RetailContextType {
  activeStore: RetailStore | null;
  activeChannel: RetailChannel | null;
  stores: RetailStore[];
  channels: RetailChannel[];
  activeShift: RetailShift | null;
  mode: RetailMode;
  isLoading: boolean;
  isConfigured: boolean;
  setMode: (mode: RetailMode) => void;
  setStore: (storeId: string | null) => void;
  setChannel: (channelId: string | null) => void;
  refreshState: () => Promise<void>;
}

const RetailContext = createContext<RetailContextType | undefined>(undefined);

export const RetailProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const session = useSession();
  const { updateLocation } = useAuth();
  const [activeStore, setActiveStore] = useState<RetailStore | null>(null);
  const [activeChannel, setActiveChannel] = useState<RetailChannel | null>(
    null,
  );
  const [stores, setStores] = useState<RetailStore[]>([]);
  const [channels, setChannels] = useState<RetailChannel[]>([]);
  const [activeShift, setActiveShift] = useState<RetailShift | null>(null);
  const [mode, setMode] = useState<RetailMode>("management");
  const [isLoading, setIsLoading] = useState(true);

  const refreshState = async () => {
    if (!session.tenantId) return;

    try {
      const [fetchedStores, fetchedChannels] = await Promise.all([
        retailService.listStores(session.tenantId, session),
        retailService.listChannels(session.tenantId, session),
      ]);

      setStores(fetchedStores);
      setChannels(fetchedChannels);

      // Logic for determining active store
      if (fetchedStores.length > 0 && !activeStore && !activeChannel) {
        setActiveStore(fetchedStores[0]);
        updateLocation(fetchedStores[0].id); // Sync with session
      } else if (activeStore) {
        const current = fetchedStores.find((s) => s.id === activeStore.id);
        if (current) setActiveStore(current);
      }

      if (activeChannel) {
        const current = fetchedChannels.find((c) => c.id === activeChannel.id);
        if (current) setActiveChannel(current);
      }

      const shifts = await retailService.listShifts(session.tenantId, session);
      const openShift = shifts.find(
        (s) => s.status === "open" && s.employeeId === session.userId,
      );
      setActiveShift(openShift || null);
    } catch (e) {
      console.error("[RetailContext] Refresh failed", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.tenantId, session.userId]);

  const setStore = async (storeId: string | null) => {
    if (!storeId) {
      setActiveStore(null);
      return;
    }
    if (!session.tenantId) return;
    const store = await retailService.getStore(
      session.tenantId,
      storeId,
      session,
    );
    if (store) {
      setActiveStore(store);
      setActiveChannel(null); // Clear channel when store is selected
      updateLocation(store.id); // Sync with session
    }
  };

  const setChannel = async (channelId: string | null) => {
    if (!channelId) {
      setActiveChannel(null);
      return;
    }
    const channel = channels.find((c) => c.id === channelId);
    if (channel) {
      setActiveChannel(channel);
      setActiveStore(null); // Clear store when channel is selected
      updateLocation(channel.id); // Sync with session
    }
  };

  return (
    <RetailContext.Provider
      value={{
        activeStore,
        activeChannel,
        stores,
        channels,
        activeShift,
        mode,
        isLoading,
        isConfigured: stores.length > 0 || channels.length > 0,
        setMode,
        setStore,
        setChannel,
        refreshState,
      }}
    >
      {children}
    </RetailContext.Provider>
  );
};

export const useRetail = () => {
  const context = useContext(RetailContext);
  if (!context)
    throw new Error("useRetail must be used within a RetailProvider");
  return context;
};
