import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { CalendarDays, CheckCircle2, XCircle, Clock } from "lucide-react";
import { formatDate, formatDateRange } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function LeavesPage() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const statusConfig: Record<string, { label: string; className: string }> = {
    pending: { label: t("leaves.pending"), className: "bg-warning/10 text-warning" },
    approved: { label: t("leaves.approved"), className: "bg-success/10 text-success" },
    rejected: { label: t("leaves.rejected"), className: "bg-destructive/10 text-destructive" },
  };

  const { data, isLoading } = useQuery({
    queryKey: ["leaves", statusFilter],
    queryFn: () => api.get(`/leaves/pending?status=${statusFilter}`),
    placeholderData: { data: [] },
  });

  const leaves = data?.data || [];

  const handleApprove = async (leaveId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.put(`/leaves/${leaveId}/approve`);
      toast.success(t("leaves.approved_success"));
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
    } catch (err: any) {
      toast.error(err.message || t("leaves.approve_failed"));
    }
  };

  const handleReject = async (leaveId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.put(`/leaves/${leaveId}/reject`);
      toast.success(t("leaves.rejected_success"));
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
    } catch (err: any) {
      toast.error(err.message || t("leaves.reject_failed"));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-luxury-heading text-2xl">{t("leaves.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("leaves.description")}
          </p>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/50 w-fit">
        {[
          { key: "pending", label: t("leaves.pending"), icon: Clock },
          { key: "approved", label: t("leaves.approved"), icon: CheckCircle2 },
          { key: "rejected", label: t("leaves.rejected"), icon: XCircle },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
              statusFilter === tab.key
                ? "bg-card shadow-luxury text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Leave Requests */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="surface-elevated p-5 space-y-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-muted" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-40 bg-muted rounded" />
                  <div className="h-3 w-24 bg-muted/60 rounded" />
                </div>
                <div className="h-6 w-16 bg-muted rounded-full" />
              </div>
            </div>
          ))
        ) : leaves.length === 0 ? (
          <div className="surface-elevated p-12 text-center">
            <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              {statusFilter === "pending"
                ? t("leaves.no_pending")
                : t("leaves.no_status", { status: statusConfig[statusFilter]?.label })}
            </p>
          </div>
        ) : (
          leaves.map((leave: any) => (
            <div
              key={leave.id}
              onClick={() => setExpandedId(expandedId === leave.id ? null : leave.id)}
              className="surface-elevated p-5 hover:shadow-luxury-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mt-0.5">
                    <span className="text-sm font-semibold text-gold">
                      {leave.employee_name?.charAt(0) || "?"}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{leave.employee_name || t("common.employee")}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {t("leaves.leave")} {leave.leave_type} • {leave.total_days} {t("leaves.days")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateRange(leave.start_date, leave.end_date)}
                    </p>
                    {leave.reason && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        "{leave.reason}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-medium",
                    statusConfig[leave.status]?.className || "bg-muted text-muted-foreground"
                  )}>
                    {statusConfig[leave.status]?.label || leave.status}
                  </span>

                  {leave.status === "pending" && (
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={(e) => handleApprove(leave.id, e)}
                        className="px-3 py-1.5 rounded-md bg-success/10 text-success text-xs font-medium hover:bg-success/20 transition-colors"
                      >
                        {t("leaves.approve")}
                      </button>
                      <button
                        onClick={(e) => handleReject(leave.id, e)}
                        className="px-3 py-1.5 rounded-md bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors"
                      >
                        {t("leaves.reject")}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded detail */}
              {expandedId === leave.id && (
                <div className="mt-4 pt-4 border-t border-border/50 animate-fade-in">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-luxury-label mb-1">{t("leaves.leave_type")}</p>
                      <p className="capitalize">{leave.leave_type || "—"}</p>
                    </div>
                    <div>
                      <p className="text-luxury-label mb-1">{t("leaves.total_days")}</p>
                      <p>{leave.total_days || "—"} {t("leaves.days")}</p>
                    </div>
                    <div>
                      <p className="text-luxury-label mb-1">{t("leaves.request_date")}</p>
                      <p>{formatDate(leave.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-luxury-label mb-1">{t("common.status")}</p>
                      <p className="capitalize">{statusConfig[leave.status]?.label || leave.status}</p>
                    </div>
                  </div>
                  {leave.reason && (
                    <div className="mt-3">
                      <p className="text-luxury-label mb-1">{t("leaves.reason")}</p>
                      <p className="text-sm">{leave.reason}</p>
                    </div>
                  )}
                  {leave.reviewer_notes && (
                    <div className="mt-3">
                      <p className="text-luxury-label mb-1">{t("leaves.reviewer_notes")}</p>
                      <p className="text-sm">{leave.reviewer_notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
