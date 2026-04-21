import { ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

/* ─── NavWidget ──────────────────────────────────────────────────── */
export interface NavWidgetProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
  iconBg: string;
  href: string;
  trend?: string;
  trendUp?: boolean;
}

export function NavWidget({
  label, value, sub, icon: Icon, color, iconBg, href, trend, trendUp,
}: NavWidgetProps) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(href)}
      className={cn(
        "group relative w-full text-left overflow-hidden rounded-3xl border border-slate-100 bg-white",
        "p-7 shadow-sm transition-all duration-300",
        "hover:-translate-y-1.5 hover:shadow-xl hover:shadow-slate-200/60 hover:border-slate-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
      )}
    >
      {/* Ambient glow */}
      <div
        className={cn(
          "absolute -right-10 -top-10 h-36 w-36 rounded-full blur-3xl opacity-25",
          "transition-opacity group-hover:opacity-50",
          iconBg,
        )}
      />

      <div className="relative z-10 flex flex-col gap-5">
        {/* Top row */}
        <div className="flex items-start justify-between">
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-2xl border border-white/60 shadow-sm",
              iconBg,
            )}
          >
            <Icon className={cn("h-6 w-6", color)} />
          </div>
          <ChevronRight
            className={cn(
              "h-5 w-5 text-slate-200 transition-all",
              "group-hover:text-slate-400 group-hover:translate-x-0.5",
            )}
          />
        </div>

        {/* Content */}
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">
            {label}
          </p>
          <p className="text-3xl font-black tracking-tighter text-slate-900 leading-none">
            {value}
          </p>

          {(sub || trend) && (
            <div className="flex items-center gap-2 mt-2.5">
              {trend && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[10px] font-black uppercase rounded-full px-2.5 py-1",
                    trendUp
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-rose-50 text-rose-500",
                  )}
                >
                  {trendUp ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {trend}
                </span>
              )}
              {sub && (
                <span className="text-[11px] text-slate-400 font-medium">
                  {sub}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

/* ─── SectionLabel ───────────────────────────────────────────────── */
export function SectionLabel({
  label,
  sub,
}: {
  label: string;
  sub?: string;
}) {
  return (
    <div className="mb-5 flex items-end gap-3">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
          {label}
        </p>
        {sub && (
          <p className="text-xs text-slate-400/70 font-medium mt-0.5">{sub}</p>
        )}
      </div>
      <div className="flex-1 h-px bg-gradient-to-r from-slate-200/80 to-transparent" />
    </div>
  );
}

/* ─── SimpleKpi ──────────────────────────────────────────────────── */
export function SimpleKpi({
  label,
  value,
  color = "text-slate-900",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="text-center">
      <p className={cn("text-xl font-black tracking-tighter", color)}>
        {value}
      </p>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">
        {label}
      </p>
    </div>
  );
}

/* ─── EmptyState ─────────────────────────────────────────────────── */
export function EmptyState({
  icon: Icon,
  color,
  bg,
  title,
  desc,
}: {
  icon: React.ElementType;
  color: string;
  bg: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50">
      <div
        className={cn(
          "h-16 w-16 rounded-2xl flex items-center justify-center mb-4 border border-white shadow-sm",
          bg,
        )}
      >
        <Icon className={cn("h-8 w-8", color)} />
      </div>
      <h3 className="text-base font-black tracking-tight text-slate-800">
        {title}
      </h3>
      <p className="text-sm font-medium text-slate-400 mt-1 max-w-xs">
        {desc}
      </p>
    </div>
  );
}
