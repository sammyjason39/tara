import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/lib/useIsMobile";
import {
  areMobileSitePermissionsGranted,
  getMobilePermissionSnapshot,
  type SitePermissionItem,
} from "@/lib/site-permissions";

interface SitePermissionsContextValue {
  items: SitePermissionItem[];
  permissionsReady: boolean;
  isChecking: boolean;
  refreshPermissions: () => Promise<void>;
}

const SitePermissionsContext = createContext<SitePermissionsContextValue | undefined>(
  undefined,
);

export function SitePermissionsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, mustChangePassword } = useAuth();
  const isMobile = useIsMobile();
  const [items, setItems] = useState<SitePermissionItem[]>([]);
  const [permissionsReady, setPermissionsReady] = useState(!isMobile);
  const [isChecking, setIsChecking] = useState(false);

  const refreshPermissions = useCallback(async () => {
    if (!isMobile) {
      setPermissionsReady(true);
      setItems([]);
      return;
    }

    setIsChecking(true);
    try {
      const snapshot = await getMobilePermissionSnapshot();
      setItems(snapshot);
      setPermissionsReady(await areMobileSitePermissionsGranted());
    } finally {
      setIsChecking(false);
    }
  }, [isMobile]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || mustChangePassword) {
      return;
    }
    void refreshPermissions();
  }, [isLoading, isAuthenticated, mustChangePassword, refreshPermissions]);

  useEffect(() => {
    if (!isMobile || !navigator.permissions?.query) return;

    let geoStatus: PermissionStatus | null = null;
    let cameraStatus: PermissionStatus | null = null;

    const onChange = () => {
      void refreshPermissions();
    };

    navigator.permissions
      .query({ name: "geolocation" })
      .then((status) => {
        geoStatus = status;
        status.onchange = onChange;
      })
      .catch(() => undefined);

    navigator.permissions
      .query({ name: "camera" as PermissionName })
      .then((status) => {
        cameraStatus = status;
        status.onchange = onChange;
      })
      .catch(() => undefined);

    return () => {
      if (geoStatus) geoStatus.onchange = null;
      if (cameraStatus) cameraStatus.onchange = null;
    };
  }, [isMobile, refreshPermissions]);

  return (
    <SitePermissionsContext.Provider
      value={{ items, permissionsReady, isChecking, refreshPermissions }}
    >
      {children}
    </SitePermissionsContext.Provider>
  );
}

export function useSitePermissions() {
  const ctx = useContext(SitePermissionsContext);
  if (!ctx) {
    throw new Error("useSitePermissions must be used within SitePermissionsProvider");
  }
  return ctx;
}
