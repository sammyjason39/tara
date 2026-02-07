import type React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type WorkflowRequestCardProps = {
  title: string;
  subtitle?: string;
  status: string;
  urgency: number;
  owner: string;
  actionLabel?: string;
  onAction?: () => void;
  footer?: React.ReactNode;
};

export function WorkflowRequestCard({
  title,
  subtitle,
  status,
  urgency,
  owner,
  actionLabel = "Open",
  onAction,
  footer,
}: WorkflowRequestCardProps) {
  const urgencyTone =
    urgency >= 80 ? "text-red-600" : urgency >= 60 ? "text-amber-600" : "text-emerald-600";

  return (
    <div className={cn("rounded-xl border bg-card p-4 shadow-sm")}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        <Badge variant="outline">{status}</Badge>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span className={cn("font-semibold", urgencyTone)}>Urgency {urgency}</span>
        <span>Owner: {owner}</span>
      </div>
      {footer ? <div className="mt-3">{footer}</div> : null}
      {onAction ? (
        <div className="mt-3 flex justify-end">
          <Button size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default WorkflowRequestCard;
