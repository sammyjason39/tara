import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { markPwaPromptForSession } from "@/lib/pwa-install";

interface User {
  id: string;
  email: string;
  full_name: string;
  employee_code: string;
  role: string;
  department: string | null;
  office: string | null;
  language_preference: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  mustChangePassword: boolean;
  shouldRotatePin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearMustChangePassword: () => void;
  dismissPinRotation: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function applyProfileFlags(data: Record<string, unknown> | undefined) {
  return {
    mustChangePassword: !!data?.must_change_password,
    shouldRotatePin: !!data?.should_rotate_pin,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("tara-token")
  );
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [shouldRotatePin, setShouldRotatePin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchProfile(token);
    } else {
      setIsLoading(false);
    }
  }, []);

  async function fetchProfile(authToken: string, options?: { keepLoading?: boolean }) {
    if (!options?.keepLoading) {
      setIsLoading(true);
    }
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.data);
        const flags = applyProfileFlags(data.data);
        setMustChangePassword(flags.mustChangePassword);
        setShouldRotatePin(flags.shouldRotatePin);
      } else {
        localStorage.removeItem("tara-token");
        setToken(null);
        setMustChangePassword(false);
        setShouldRotatePin(false);
      }
    } catch {
      // Offline or server down — keep token for later
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshProfile() {
    if (!token) return;
    await fetchProfile(token, { keepLoading: true });
  }

  async function login(email: string, password: string) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || "Login failed");
    }

    const data = await res.json();
    setToken(data.token);
    setUser(data.user);
    setMustChangePassword(!!data.must_change_password);
    setShouldRotatePin(false);
    localStorage.setItem("tara-token", data.token);
    markPwaPromptForSession();
    await fetchProfile(data.token, { keepLoading: true });
  }

  function logout() {
    setToken(null);
    setUser(null);
    setMustChangePassword(false);
    setShouldRotatePin(false);
    sessionStorage.removeItem("tara-pin-rotation-dismissed");
    localStorage.removeItem("tara-pin-rotation-dismiss-until");
    localStorage.removeItem("tara-token");
  }

  function clearMustChangePassword() {
    setMustChangePassword(false);
  }

  function dismissPinRotation() {
    setShouldRotatePin(false);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        mustChangePassword,
        shouldRotatePin,
        login,
        logout,
        clearMustChangePassword,
        dismissPinRotation,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
