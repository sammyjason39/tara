import React, { useState, useEffect } from "react";
import { Wifi, WifiOff, Database } from "lucide-react";
import { apiRequest } from "@/core/api/apiClient";
import { useSession } from "@/core/security/session";
import { cn } from "@/lib/utils";

/**
 * ConnectivityStatus Component
 * Monitors online/offline status and backend availability.
 */
export const ConnectivityStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(window.navigator.onLine);
  const [isBackendReachable, setIsBackendReachable] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const session = useSession();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleSyncStart = () => setIsSyncing(true);
    const handleSyncEnd = () => setIsSyncing(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("SYNC_START", handleSyncStart);
    window.addEventListener("SYNC_END", handleSyncEnd);

    // Periodically check backend reachability
    const checkBackend = async () => {
      try {
        await apiRequest("/monitoring/health", "GET", session);
        setIsBackendReachable(true);
      } catch (err) {
        setIsBackendReachable(false);
      }
    };

    const interval = setInterval(checkBackend, 15000);
    checkBackend();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("SYNC_START", handleSyncStart);
      window.removeEventListener("SYNC_END", handleSyncEnd);
      clearInterval(interval);
    };
  }, []);

  const status = isOnline && isBackendReachable ? "synced" : "local";

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-all duration-300",
        status === "synced"
          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
          : "bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse"
      )}
    >
      {isSyncing ? (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Syncing...</span>
        </div>
      ) : status === "synced" ? (
        <>
          <Wifi className="w-3.5 h-3.5" />
          <span>Cloud Synced</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5" />
          <span>Local Mode</span>
        </>
      )}
      <div className="w-1 h-1 rounded-full bg-current opacity-50" />
      <Database className="w-3.5 h-3.5" />
    </div>
  );
};

export default ConnectivityStatus;
