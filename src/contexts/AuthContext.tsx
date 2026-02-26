import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import * as storage from "@/lib/local-storage";
import { type SessionContext } from "@/core/security/session";
import { type Role, Roles } from "@/core/security/roles";

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
      fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${storedToken}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data) {
            setUser(data.data);
            if (storedSession) {
              setSessionState(JSON.parse(storedSession));
            } else if (
              data.data.userCompanies &&
              data.data.userCompanies.length > 0
            ) {
              // Auto-select default company
              const defaultCompany =
                data.data.userCompanies.find((c: any) => c.isDefault) ||
                data.data.userCompanies[0];
              const newSession = {
                userId: data.data.id,
                tenantId: defaultCompany.tenantId,
                locationId: "loc-default", // Will be fetched or provisioned
                role: defaultCompany.role as Role,
                departmentId: "dept-default",
                token: storedToken,
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

  const setSession = (newSession: SessionContext) => {
    setSessionState(newSession);
    localStorage.setItem("ZENVIX_SESSION", JSON.stringify(newSession));
  };

  const login = async (credentials: any) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      const data = await res.json();

      if (data.success) {
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
            locationId: "loc-default",
            role: defaultCompany.role as Role,
            departmentId: "dept-default",
            token: data.token,
          };
          setSession(newSession);
        }

        return { success: true };
      }
      return { success: false, error: data.message || "Login failed" };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const registerUser = async (formData: any) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      return data.success
        ? { success: true }
        : { success: false, error: data.message };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const provisionCompany = async (formData: any) => {
    try {
      const token = localStorage.getItem("ZENVIX_TOKEN");
      const res = await fetch("/api/auth/company/provision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const json = await res.json();

      if (json.success) {
        // Create active session based on provisioned data
        const newSession = {
          userId: user?.id || "unknown",
          tenantId: json.data.tenantId,
          locationId: json.data.locationId,
          role: Roles.SUPERADMIN, // Owner mapped to Superadmin effectively for frontend
          departmentId: json.data.departmentId,
          token: token as string,
        };
        setSession(newSession);

        // Reload user to get updated userCompanies
        const meRes = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const meData = await meRes.json();
        if (meData.success) setUser(meData.data);

        return { success: true, session: newSession };
      }
      return { success: false, error: json.message };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const logout = () => {
    localStorage.removeItem("ZENVIX_TOKEN");
    localStorage.removeItem("ZENVIX_SESSION");
    storage.clearAllData(); // Clear App/POS specific data
    setUser(null);
    setSessionState(null);
  };

  const updateLocation = (locationId: string) => {
    if (session) {
      const newSession = { ...session, locationId };
      setSession(newSession);
    }
  };

  return (
    <AuthContext.Provider
      value={{
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
