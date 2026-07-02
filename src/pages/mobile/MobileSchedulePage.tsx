import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { CalendarClock, Clock, ChevronRight, Users } from "lucide-react";
import { formatDate, formatDateWithWeekday } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const dayNames = ["", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export function MobileSchedulePage() {
  const navigate = useNavigate();

  // Fetch my schedule (employee's own assigned schedule)
  const { data: myScheduleData, isLoading } = useQuery({
    queryKey: ["my-schedule"],
    queryFn: () => api.get("/schedules/my-schedule"),
    placeholderData: { data: null },
  });

  // Fetch all schedules for reference
  const { data: schedulesData } = useQuery({
    queryKey: ["schedules"],
    queryFn: () => api.get("/schedules"),
    placeholderData: { data: [] },
  });

  const mySchedule = myScheduleData?.data;
  const allSchedules = schedulesData?.data || [];

  const today = new Date();
  const todayDay = today.getDay() === 0 ? 7 : today.getDay(); // Convert Sunday=0 to 7

  return (
    <div className="px-5 py-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-display font-semibold">Jadwal Saya</h1>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDateWithWeekday(today)}
        </p>
      </div>

      {/* My Current Schedule */}
      {isLoading ? (
        <div className="surface-elevated p-8 text-center">
          <div className="h-6 w-6 rounded-full border-2 border-gold/30 border-t-gold animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground mt-3">Memuat jadwal...</p>
        </div>
      ) : mySchedule?.schedule ? (
        <div className="surface-elevated p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-gold/10">
                <CalendarClock className="h-5 w-5 text-gold" />
              </div>
              <div>
                <p className="text-sm font-medium">{mySchedule.schedule.schedule_name}</p>
                <p className="text-2xs text-muted-foreground">Jadwal aktif Anda</p>
              </div>
            </div>
          </div>

          {/* Time Display */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30">
            <div className="flex-1 text-center">
              <p className="text-2xs text-muted-foreground mb-1">Masuk</p>
              <p className="text-xl font-mono font-semibold">{mySchedule.schedule.start_time}</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex-1 text-center">
              <p className="text-2xs text-muted-foreground mb-1">Pulang</p>
              <p className="text-xl font-mono font-semibold">{mySchedule.schedule.end_time}</p>
            </div>
            {mySchedule.schedule.break_start && (
              <>
                <div className="h-8 w-px bg-border" />
                <div className="flex-1 text-center">
                  <p className="text-2xs text-muted-foreground mb-1">Istirahat</p>
                  <p className="text-sm font-mono">{mySchedule.schedule.break_start}-{mySchedule.schedule.break_end}</p>
                </div>
              </>
            )}
          </div>

          {/* Work Days */}
          <div>
            <p className="text-2xs text-muted-foreground mb-2">Hari Kerja</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map((d) => {
                const isWorkDay = (mySchedule.schedule.work_days || []).includes(d);
                const isToday = d === todayDay;
                return (
                  <div key={d} className={cn(
                    "h-9 w-9 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                    isToday && isWorkDay ? "bg-gold text-gold-foreground ring-2 ring-gold/30" :
                    isToday && !isWorkDay ? "bg-destructive/10 text-destructive ring-2 ring-destructive/30" :
                    isWorkDay ? "bg-gold/10 text-gold" : "bg-muted/50 text-muted-foreground"
                  )}>
                    {dayNames[d]}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Effective Dates */}
          <div className="pt-3 border-t border-border/50">
            <p className="text-2xs text-muted-foreground">
              Berlaku sejak {formatDate(mySchedule.effective_from)}
              {mySchedule.effective_to && ` hingga ${formatDate(mySchedule.effective_to)}`}
            </p>
          </div>
        </div>
      ) : (
        <div className="surface-elevated p-8 text-center space-y-2">
          <CalendarClock className="h-10 w-10 mx-auto text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Belum ada jadwal ditugaskan</p>
          <p className="text-2xs text-muted-foreground">Hubungi HR untuk penugasan jadwal</p>
        </div>
      )}

      {/* Today Status Card */}
      {mySchedule?.schedule && (
        <div className={cn(
          "surface-elevated p-4 border-l-4",
          (mySchedule.schedule.work_days || []).includes(todayDay)
            ? "border-l-gold"
            : "border-l-muted-foreground"
        )}>
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-gold" />
            <div>
              <p className="text-sm font-medium">
                {(mySchedule.schedule.work_days || []).includes(todayDay)
                  ? "Hari ini adalah hari kerja"
                  : "Hari ini adalah hari libur"}
              </p>
              <p className="text-2xs text-muted-foreground">
                {(mySchedule.schedule.work_days || []).includes(todayDay)
                  ? `Jam kerja: ${mySchedule.schedule.start_time} - ${mySchedule.schedule.end_time}`
                  : "Tidak ada jadwal kerja hari ini"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* All Available Schedules */}
      <div className="space-y-3">
        <h2 className="text-luxury-label">Semua Jadwal Perusahaan</h2>
        {allSchedules.length === 0 ? (
          <div className="surface-inset p-4 text-sm text-muted-foreground text-center">
            Belum ada jadwal tersedia
          </div>
        ) : (
          allSchedules.map((s: any) => (
            <div key={s.id} className="surface-elevated p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{s.schedule_name}</p>
                {s.is_default && (
                  <span className="px-2 py-0.5 rounded-full text-2xs bg-gold/10 text-gold font-medium">Default</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <span className="text-xs font-mono">{s.start_time} - {s.end_time}</span>
                <span className="text-2xs flex items-center gap-1">
                  <Users className="h-3 w-3" /> {s.assignments?.length || 0}
                </span>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <span key={d} className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center text-2xs font-medium",
                    (s.work_days || []).includes(d) ? "bg-gold/10 text-gold" : "bg-muted/30 text-muted-foreground"
                  )}>{dayNames[d]}</span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
