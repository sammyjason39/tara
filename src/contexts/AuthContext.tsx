import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import * as storage from "@/lib/local-storage";
import { type SessionContext } from "@/core/security/session";
import { type Role, Roles } from "@/core/security/roles";
import { apiRequest } from "@/core/api/apiClient";
import { retailService } from "@/core/services/retail/retailService";

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userCompanies?: {
    tenantId: string;
    role: string;
    isDefault: boolean;
    company: {
      id: string;
      name: string;
    };
  }[];
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  session: SessionContext | null;
  login: (credentials: any) => Promise<{ success: boolean; error?: string }>;
  registerUser: (data: any) => Promise<{ success: boolean; error?: string }>;
  provisionCompany: (
    data: any,
  ) => Promise<{ success: boolean; error?: string; session?: SessionContext }>;
  logout: () => void;
  setSession: (session: SessionContext) => void;
  updateLocation: (locationId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSessionState] = useState<SessionContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Attempt to restore session from storage
    const storedToken = localStorage.getItem("ZENVIX_TOKEN");
    const storedSession = localStorage.getItem("ZENVIX_SESSION");
    console.log("[AuthContext] Init:", {
      hasToken: !!storedToken,
      hasSession: !!storedSession,
    });

    if (storedToken) {
      // Validate token and fetch user
      apiRequest<any>("/v1/auth/me", "GET", { token: storedToken } as any)
        .then((data) => {
          if (data) {
            setUser(data);
            if (storedSession) {
              const parsedSession = JSON.parse(storedSession) as SessionContext;
              setSessionState({
                ...parsedSession,
                permissions: parsedSession.permissions || [],
              });
            } else if (
              data.userCompanies &&
              data.userCompanies.length > 0
            ) {
              // Auto-select default company
              const defaultCompany =
                data.userCompanies.find((c: any) => c.isDefault) ||
                data.userCompanies[0];
              const newSession = {
                userId: data.id,
                tenantId: defaultCompany.tenantId,
                locationId: "", 
                role: defaultCompany.role as Role,
                departmentId: "dept-default",
                token: storedToken,
                permissions: [
                  "VIEW_FINANCIALS",
                  "VIEW_INVENTORY",
                  "VIEW_DEVICES",
                  "VIEW_HR",
                  "VIEW_AUDIT",
                  "MANAGE_STORE",
                ],
              };
              setSession(newSession);
            }
          } else {
            logout();
          }
        })
        .catch(() => logout())
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const setSession = useCallback((newSession: SessionContext) => {
    setSessionState(newSession);
    localStorage.setItem("ZENVIX_SESSION", JSON.stringify(newSession));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("ZENVIX_TOKEN");
    localStorage.removeItem("ZENVIX_SESSION");
    storage.clearAllData(); // Clear App/POS specific data
    setUser(null);
    setSessionState(null);
  }, []);

  const login = useCallback(
    async (credentials: any) => {
      try {
        const data = await apiRequest<any>("/v1/auth/login", "POST", null, credentials);

        if (data.token) {
          localStorage.setItem("ZENVIX_TOKEN", data.token);
          setUser(data.user);

          // If they have companies, setup session
          if (data.user.userCompanies && data.user.userCompanies.length > 0) {
            const defaultCompany =
              data.user.userCompanies.find((c: any) => c.isDefault) ||
              data.user.userCompanies[0];
            const newSession = {
              userId: data.user.id,
              tenantId: defaultCompany.tenantId,
              locationId: "",
              role: defaultCompany.role as Role,
              departmentId: "dept-ret",
              token: data.token,
              permissions: [
                "VIEW_FINANCIALS",
                "VIEW_INVENTORY",
                "VIEW_DEVICES",
                "VIEW_HR",
                "VIEW_AUDIT",
                "MANAGE_STORE",
              ],
            };
            setSession(newSession);
          }

          return { success: true };
        }
        return { success: false, error: "Login failed" };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    },
    [setSession],
  );

  const registerUser = useCallback(async (formData: any) => {
    try {
      await apiRequest("/v1/auth/register", "POST", null, formData);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }, []);

  const provisionCompany = useCallback(
    async (formData: any) => {
      try {
        const token = localStorage.getItem("ZENVIX_TOKEN");
        const json = await apiRequest<any>("/v1/auth/company/provision", "POST", { token } as any, formData);

        if (json) {
          // Create active session based on provisioned data
          const newSession = {
            userId: user?.id || "unknown",
            tenantId: json.tenantId || json.data?.tenantId,
            locationId: json.locationId || json.data?.locationId,
            role: Roles.SUPERADMIN, 
            departmentId: json.departmentId || json.data?.departmentId,
            token: token as string,
            permissions: [
              "VIEW_FINANCIALS",
              "VIEW_INVENTORY",
              "VIEW_DEVICES",
              "VIEW_HR",
              "VIEW_AUDIT",
              "MANAGE_STORE",
            ],
          };
          setSession(newSession);

          // Reload user to get updated userCompanies
          const meData = await apiRequest<any>("/v1/auth/me", "GET", { token } as any);
          if (meData) setUser(meData);

          return { success: true, session: newSession };
        }
        return { success: false, error: "Provisioning failed" };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    },
    [user, setSession],
  );

  const updateLocation = useCallback(
    (locationId: string) => {
      setSessionState((prev) => {
        if (!prev || prev.locationId === locationId) return prev;
        const next = { ...prev, locationId };
        localStorage.setItem("ZENVIX_SESSION", JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  // Auto-resolve locationId if missing but tenantId is present
  useEffect(() => {
    if (session && session.tenantId && !session.locationId) {
      console.log("[AuthContext] Missing locationId, attempting auto-resolution...");
      retailService.listStores(session.tenantId, session)
        .then(stores => {
          if (stores && stores.length > 0) {
            console.log("[AuthContext] Auto-resolved locationId:", stores[0].id);
            updateLocation(stores[0].id);
          }
        })
        .catch(err => {
          console.error("[AuthContext] Location resolution failed:", err);
        });
    }
  }, [session, updateLocation]);

  const value = useMemo(
    () => ({
      isAuthenticated: !!user,
      isLoading,
      user,
      session,
      login,
      registerUser,
      provisionCompany,
      logout,
      setSession,
      updateLocation,
    }),
    [
      user,
      isLoading,
      session,
      login,
      registerUser,
      provisionCompany,
      logout,
      setSession,
      updateLocation,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
