import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Camera, Loader2, X } from "lucide-react";
import { api, fetchAuthenticatedBlobUrl } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

export type AttendanceRecordSummary = {
  id: string;
  employee_id: string;
  employee_name: string | null;
  employee_code: string | null;
  department_name?: string | null;
  attendance_date: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  clock_in_source?: string | null;
  clock_out_source?: string | null;
  is_tardy: boolean;
  tardiness_minutes: number;
  office_name?: string | null;
  has_clock_in_photo?: boolean;
  has_clock_out_photo?: boolean;
};

type Props = {
  attendanceId: string | null;
  onClose: () => void;
};

function AttendancePhotoPanel({
  attendanceId,
  type,
  label,
  available,
}: {
  attendanceId: string;
  type: "in" | "out";
  label: string;
  available: boolean;
}) {
  const { t } = useTranslation();

  const { data: photoUrl, isLoading, isError } = useQuery({
    queryKey: ["attendance-photo", attendanceId, type],
    queryFn: () => fetchAuthenticatedBlobUrl(`/attendance/${attendanceId}/photo/${type}`),
    enabled: available && !!attendanceId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });

  const blobUrlRef = useRef<string | null>(null);
  useEffect(() => {
    if (blobUrlRef.current && blobUrlRef.current !== photoUrl) {
      URL.revokeObjectURL(blobUrlRef.current);
    }
    blobUrlRef.current = photoUrl ?? null;
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [photoUrl]);

  return (
    <div className="space-y-2">
      <p className="text-luxury-label flex items-center gap-1.5">
        <Camera className="h-3.5 w-3.5" />
        {label}
      </p>
      <div className="flex w-full aspect-[3/4] items-end justify-center overflow-hidden rounded-xl border border-border bg-black/90">
        {!available ? (
          <div className="flex h-full w-full items-center justify-center p-4 text-center">
            <p className="text-xs text-muted-foreground">{t("attendance.no_photo")}</p>
          </div>
        ) : isLoading ? (
          <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isError || !photoUrl ? (
          <div className="flex h-full w-full items-center justify-center p-4 text-center">
            <p className="text-xs text-destructive">{t("attendance.photo_load_failed")}</p>
          </div>
        ) : (
          <img
            src={photoUrl}
            alt={label}
            className="max-h-full max-w-full object-contain object-bottom"
          />
        )}
      </div>
    </div>
  );
}

export function AttendanceDetailDialog({ attendanceId, onClose }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const handleClose = () => {
    if (attendanceId) {
      queryClient.removeQueries({ queryKey: ["attendance-photo", attendanceId] });
      queryClient.removeQueries({ queryKey: ["attendance-detail", attendanceId] });
    }
    onClose();
  };

  const { data, isLoading } = useQuery({
    queryKey: ["attendance-detail", attendanceId],
    queryFn: () => api.get<{ data: AttendanceRecordSummary }>(`/attendance/${attendanceId}`),
    enabled: !!attendanceId,
  });

  const detail = data?.data;

  if (!attendanceId) return null;

  const formatTime = (value: string | null | undefined) =>
    value
      ? new Date(value).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
      : "—";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-0 sm:p-4"
      onClick={handleClose}
    >
      <div
        className="bg-card w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-luxury-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-5 py-4">
          <div>
            <h3 className="font-display text-lg font-semibold">{t("attendance.detail_title")}</h3>
            {detail?.employee_name && (
              <p className="text-sm text-muted-foreground mt-0.5">{detail.employee_name}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md p-1.5 hover:bg-accent"
            aria-label={t("attendance.close")}
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !detail ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              {t("attendance.detail_not_found")}
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-luxury-label mb-1">{t("attendance.date")}</p>
                  <p>{formatDate(detail.attendance_date)}</p>
                </div>
                <div>
                  <p className="text-luxury-label mb-1">{t("attendance.employee_code")}</p>
                  <p>{detail.employee_code || "—"}</p>
                </div>
                <div>
                  <p className="text-luxury-label mb-1">{t("attendance.department")}</p>
                  <p>{detail.department_name || "—"}</p>
                </div>
                <div>
                  <p className="text-luxury-label mb-1">{t("attendance.clock_in")}</p>
                  <p className="font-mono">{formatTime(detail.clock_in_time)}</p>
                  <p className="text-2xs text-muted-foreground capitalize mt-0.5">
                    {detail.clock_in_source || "phone"}
                  </p>
                </div>
                <div>
                  <p className="text-luxury-label mb-1">{t("attendance.clock_out")}</p>
                  <p className="font-mono">{formatTime(detail.clock_out_time)}</p>
                  <p className="text-2xs text-muted-foreground capitalize mt-0.5">
                    {detail.clock_out_time ? detail.clock_out_source || "phone" : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-luxury-label mb-1">{t("attendance.status")}</p>
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-medium",
                      detail.is_tardy
                        ? "bg-warning/10 text-warning"
                        : "bg-success/10 text-success",
                    )}
                  >
                    {detail.is_tardy
                      ? t("attendance.late_minutes", { minutes: detail.tardiness_minutes })
                      : t("attendance.on_time")}
                  </span>
                </div>
                {detail.office_name && (
                  <div className="col-span-2 sm:col-span-3">
                    <p className="text-luxury-label mb-1">{t("attendance.office")}</p>
                    <p>{detail.office_name}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AttendancePhotoPanel
                  attendanceId={detail.id}
                  type="in"
                  label={t("attendance.photo_in")}
                  available={!!detail.has_clock_in_photo}
                />
                <AttendancePhotoPanel
                  attendanceId={detail.id}
                  type="out"
                  label={t("attendance.photo_out")}
                  available={!!detail.has_clock_out_photo}
                />
              </div>

              {(detail.clock_in_time || detail.clock_out_time) && (
                <p className="text-2xs text-muted-foreground text-center">
                  {detail.clock_in_time && (
                    <>
                      {t("attendance.clock_in")}: {formatDateTime(detail.clock_in_time)}
                    </>
                  )}
                  {detail.clock_in_time && detail.clock_out_time && " · "}
                  {detail.clock_out_time && (
                    <>
                      {t("attendance.clock_out")}: {formatDateTime(detail.clock_out_time)}
                    </>
                  )}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
