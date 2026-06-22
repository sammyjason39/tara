import * as React from "react";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * The defined glassmorphic surface variants of the Design_System.
 *
 * - `card`     → the standard `glass-card` surface (default).
 * - `morphism` → the heavier `glass-morphism` surface used by POS shells.
 *
 * Both map onto existing design-system utility classes so card surfaces stay
 * uniform across Pages (Requirement 7.2). Colors are derived from Theme_Tokens
 * via those utilities and the shadcn `Card` primitive — no Hardcoded_Color is
 * introduced here (Requirement 7.1).
 */
export type GlassCardVariant = "card" | "morphism";

const glassVariantClasses: Record<GlassCardVariant, string> = {
  card: "glass-card",
  morphism: "glass-morphism",
};

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Which glassmorphic surface to render. Defaults to the standard `glass-card`. */
  variant?: GlassCardVariant;
}

/**
 * GlassCard — the single, standard glassmorphic surface component of the
 * Design_System (the Glass_Card). It wraps the shadcn `Card` primitive and the
 * existing `glass-card` / `glass-morphism` utility classes so every Page groups
 * content into a uniform card surface (Requirement 7.2).
 *
 * It is composable and consistent with the `Card` primitive API: it accepts
 * `className`, `children`, forwards all native div props, and forwards its ref.
 * Compose it with the re-exported `GlassCardHeader`, `GlassCardTitle`,
 * `GlassCardDescription`, `GlassCardContent`, and `GlassCardFooter` parts.
 */
const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = "card", ...props }, ref) => (
    <Card ref={ref} className={cn(glassVariantClasses[variant], className)} {...props} />
  ),
);
GlassCard.displayName = "GlassCard";

// Re-export the Card structural parts under GlassCard names so consumers get a
// complete, composable API consistent with the existing Card primitive.
const GlassCardHeader = CardHeader;
const GlassCardTitle = CardTitle;
const GlassCardDescription = CardDescription;
const GlassCardContent = CardContent;
const GlassCardFooter = CardFooter;

export {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
  GlassCardFooter,
};
