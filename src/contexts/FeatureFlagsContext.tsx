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
  DEFAULT_FEATURE_MODULES,
  mergeFeatureModules,
  type FeatureDefinition,
  type FeatureKey,
  type FeatureModules,
} from "@/lib/feature-flags";

interface PublicFeaturesResponse {
  modules: FeatureModules;
  definitions: FeatureDefinition[];
}

interface FeatureFlagsContextValue {
  modules: FeatureModules;
  definitions: FeatureDefinition[];
  isLoading: boolean;
  isEnabled: (feature: FeatureKey | null | undefined) => boolean;
  refreshFeatures: () => Promise<void>;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | undefined>(
  undefined,
);

async function fetchPublicFeatures(): Promise<PublicFeaturesResponse> {
  const res = await fetch("/api/public/features");
  if (!res.ok) {
    throw new Error("Gagal memuat konfigurasi fitur");
  }
  const json = await res.json();
  return json.data as PublicFeaturesResponse;
}

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const [modules, setModules] = useState<FeatureModules>(DEFAULT_FEATURE_MODULES);
  const [definitions, setDefinitions] = useState<FeatureDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshFeatures = useCallback(async () => {
    try {
      const data = await fetchPublicFeatures();
      setModules(mergeFeatureModules(data.modules));
      setDefinitions(data.definitions ?? []);
    } catch {
      setModules(DEFAULT_FEATURE_MODULES);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshFeatures();
  }, [refreshFeatures]);

  const isEnabled = useCallback(
    (feature: FeatureKey | null | undefined) => {
      if (!feature) return true;
      return modules[feature] ?? true;
    },
    [modules],
  );

  const value = useMemo<FeatureFlagsContextValue>(
    () => ({
      modules,
      definitions,
      isLoading,
      isEnabled,
      refreshFeatures,
    }),
    [modules, definitions, isLoading, isEnabled, refreshFeatures],
  );

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags() {
  const ctx = useContext(FeatureFlagsContext);
  if (!ctx) {
    throw new Error("useFeatureFlags must be used within FeatureFlagsProvider");
  }
  return ctx;
}
