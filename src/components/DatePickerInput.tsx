import { useId } from "react";
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

/**
 * Native date input overlaid on a styled display.
 * The invisible input must receive taps directly — programmatic showPicker()
 * from a button does not work reliably on iOS/Android PWA.
 */
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
  const display = formatDate(value, "");

  return (
    <div className={cn("relative", className)}>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none flex h-10 min-h-[44px] w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-sm",
          disabled && "opacity-50",
        )}
      >
        <span className={cn("flex-1 truncate", !display && "text-muted-foreground")}>
          {display || placeholder}
        </span>
        <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
      <input
        id={inputId}
        type="date"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        aria-label={ariaLabel ?? "Pilih tanggal"}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 touch-manipulation",
          disabled && "cursor-not-allowed",
        )}
      />
    </div>
  );
}
