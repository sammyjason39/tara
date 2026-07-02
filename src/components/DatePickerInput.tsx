import { useId, useRef } from "react";
import { Calendar } from "lucide-react";
import { DISPLAY_DATE_FORMAT, formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  "aria-label"?: string;
};

export function DatePickerInput({
  value,
  onChange,
  className,
  min,
  max,
  disabled,
  placeholder = DISPLAY_DATE_FORMAT,
  id,
  "aria-label": ariaLabel,
}: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const nativeRef = useRef<HTMLInputElement>(null);
  const display = formatDate(value, "");

  const openPicker = () => {
    if (disabled) return;
    const el = nativeRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") {
      el.showPicker();
    } else {
      el.click();
    }
  };

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        id={inputId}
        disabled={disabled}
        aria-label={ariaLabel ?? "Pilih tanggal"}
        onClick={openPicker}
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-left text-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <span className={cn("flex-1 truncate", !display && "text-muted-foreground")}>
          {display || placeholder}
        </span>
        <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
      <input
        ref={nativeRef}
        type="date"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        tabIndex={-1}
        aria-hidden
      />
    </div>
  );
}
