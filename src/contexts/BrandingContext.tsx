import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyBrandingCss,
  DEFAULT_BRANDING,
  normalizeBrandingConfig,
  type BrandingConfig,
} from "@/lib/color-utils";
import { APP_VERSION } from "@/lib/version";

export interface PublicBranding {
  company_name: string;
  legal_name: string;
  logo_url: string | null;
  logo_updated_at: string | null;
  branding: BrandingConfig;
}

interface BrandingContextValue {
  companyName: string;
  legalName: string;
  logoUrl: string | null;
  branding: BrandingConfig;
  appVersion: string;
  isLoading: boolean;
  refreshBranding: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextValue | undefined>(undefined);

async function fetchPublicBranding(): Promise<PublicBranding> {
  const res = await fetch("/api/public/branding");
  if (!res.ok) {
    throw new Error("Gagal memuat branding");
  }
  const json = await res.json();
  return json.data as PublicBranding;
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PublicBranding | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshBranding = useCallback(async () => {
    try {
      const branding = await fetchPublicBranding();
      setData(branding);
      applyBrandingCss(normalizeBrandingConfig(branding.branding || DEFAULT_BRANDING));
    } catch {
      applyBrandingCss(DEFAULT_BRANDING);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshBranding();
  }, [refreshBranding]);

  const value = useMemo<BrandingContextValue>(() => {
    const branding = normalizeBrandingConfig(data?.branding);
    const cacheBuster = data?.logo_updated_at
      ? `?v=${encodeURIComponent(data.logo_updated_at)}`
      : "";

    return {
      companyName: data?.company_name || "TARA",
      legalName: data?.legal_name || "",
      logoUrl: data?.logo_url ? `${data.logo_url}${cacheBuster}` : null,
      branding,
      appVersion: APP_VERSION,
      isLoading,
      refreshBranding,
    };
  }, [data, isLoading, refreshBranding]);

  return (
    <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
  );
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error("useBranding must be used within BrandingProvider");
  return ctx;
}
