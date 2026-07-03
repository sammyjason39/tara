import { Type } from "lucide-react";
import {
  FONT_THEME_PRESETS,
  GOOGLE_FONT_DISPLAY,
  GOOGLE_FONT_MONO,
  GOOGLE_FONT_SANS,
  applyBrandingFonts,
  findFontById,
  type FontThemeConfig,
} from "@/lib/google-fonts";
import { cn } from "@/lib/utils";

type Props = {
  value: FontThemeConfig;
  onChange: (fonts: FontThemeConfig) => void;
};

function FontSelect({
  label,
  hint,
  options,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  options: typeof GOOGLE_FONT_SANS;
  value: string;
  onChange: (id: string) => void;
}) {
  const selected = findFontById(value);
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-foreground">{label}</label>
      <p className="text-2xs text-muted-foreground">{hint}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
        style={{ fontFamily: selected?.family }}
      >
        {options.map((opt) => (
          <option key={opt.id} value={opt.id} style={{ fontFamily: opt.family }}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function FontThemePicker({ value, onChange }: Props) {
  const activePreset = FONT_THEME_PRESETS.find(
    (p) =>
      p.fonts.sans === value.sans &&
      p.fonts.display === value.display &&
      p.fonts.mono === value.mono,
  );

  const update = (next: FontThemeConfig) => {
    onChange(next);
    applyBrandingFonts(next);
  };

  return (
    <div className="surface-elevated p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Type className="h-4 w-4 text-gold" />
        <h3 className="text-sm font-semibold">Font Tema</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Font 1 (teks utama), Font 2 (judul/display), dan Font 3 (angka/kode) berlaku di seluruh situs — login, dashboard, mobile, dan dokumentasi.
      </p>

      {/* Presets */}
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-luxury text-muted-foreground">
          Preset cepat
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {FONT_THEME_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => update(preset.fonts)}
              className={cn(
                "text-left rounded-lg border px-3 py-2.5 transition-colors",
                activePreset?.id === preset.id
                  ? "border-gold bg-gold/10"
                  : "border-input hover:bg-accent",
              )}
            >
              <p className="text-sm font-medium">{preset.name}</p>
              <p className="text-2xs text-muted-foreground mt-0.5">{preset.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Individual picks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2 border-t border-border">
        <FontSelect
          label="Font 1 — Teks Utama"
          hint="Body, label, tombol, paragraf"
          options={GOOGLE_FONT_SANS}
          value={value.sans}
          onChange={(sans) => update({ ...value, sans })}
        />
        <FontSelect
          label="Font 2 — Judul & Display"
          hint="Heading, logo teks, angka besar"
          options={GOOGLE_FONT_DISPLAY}
          value={value.display}
          onChange={(display) => update({ ...value, display })}
        />
        <FontSelect
          label="Font 3 — Mono & Angka"
          hint="Jam, PIN, kode, tabel angka"
          options={GOOGLE_FONT_MONO}
          value={value.mono}
          onChange={(mono) => update({ ...value, mono })}
        />
      </div>

      {/* Live preview */}
      <div className="rounded-lg border border-border bg-background p-4 space-y-2">
        <p className="text-2xs uppercase tracking-luxury text-muted-foreground">Pratinjau</p>
        <p className="font-display text-xl font-semibold">Total Assistance for Resources</p>
        <p className="text-sm">
          Teks utama menggunakan Font 1. Semua pengguna melihat font yang sama setelah disimpan.
        </p>
        <p className="font-mono text-sm text-muted-foreground">08:30:00 · PIN · ABC-123</p>
      </div>
    </div>
  );
}
