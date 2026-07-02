import { Navigate } from "react-router-dom";
import { useFeatureFlags } from "@/contexts/FeatureFlagsContext";
import type { FeatureKey } from "@/lib/feature-flags";

interface FeatureGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
  fallbackTo?: string;
}

export function FeatureGate({
  feature,
  children,
  fallbackTo = "/web",
}: FeatureGateProps) {
  const { isEnabled, isLoading } = useFeatureFlags();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-sm text-muted-foreground">
        Memuat...
      </div>
    );
  }

  if (!isEnabled(feature)) {
    return <Navigate to={fallbackTo} replace />;
  }

  return <>{children}</>;
}

interface MobileFeatureGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
}

export function MobileFeatureGate({
  feature,
  children,
}: MobileFeatureGateProps) {
  const { isEnabled, isLoading } = useFeatureFlags();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-sm text-muted-foreground">
        Memuat...
      </div>
    );
  }

  if (!isEnabled(feature)) {
    return <Navigate to="/m" replace />;
  }

  return <>{children}</>;
}
