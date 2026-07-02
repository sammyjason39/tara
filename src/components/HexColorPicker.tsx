import { useEffect, useId, useState } from "react";
import { isValidHex, normalizeHex } from "@/lib/color-utils";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  className?: string;
};

export function HexColorPicker({ label, value, onChange, className }: Props) {
  const id = useId();
  const [text, setText] = useState(value);

  useEffect(() => {
    setText(value);
  }, [value]);

  const safeColor = isValidHex(value) ? normalizeHex(value) : "#000000";

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    setText(trimmed);
    if (isValidHex(trimmed)) {
      onChange(normalizeHex(trimmed));
    }
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="text-2xs text-muted-foreground font-medium">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={safeColor}
          onChange={(e) => commit(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded-md border border-input bg-background p-1"
          aria-label={`${label} color picker`}
        />
        <input
          id={id}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => commit(text)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit(text);
          }}
          placeholder="#RRGGBB"
          className={cn(
            "flex-1 h-10 px-3 rounded-md border bg-background text-sm font-mono",
            isValidHex(text) || text === "" ? "border-input" : "border-destructive",
          )}
        />
      </div>
    </div>
  );
}
