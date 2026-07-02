import { useRef, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Image, Palette, Save, Trash2, Upload } from "lucide-react";
import { api } from "@/lib/api";
import { HexColorPicker } from "@/components/HexColorPicker";
import { CompanyLogo } from "@/components/CompanyLogo";
import { useBranding } from "@/contexts/BrandingContext";
import { DEFAULT_BRANDING, type BrandingConfig } from "@/lib/color-utils";
import { cn } from "@/lib/utils";

type Props = {
  initialBranding?: BrandingConfig;
  logoUrl?: string | null;
};

export function BrandingSettingsPanel({ initialBranding, logoUrl }: Props) {
  const queryClient = useQueryClient();
  const { refreshBranding } = useBranding();
  const fileRef = useRef<HTMLInputElement>(null);
  const [branding, setBranding] = useState<BrandingConfig>(initialBranding || DEFAULT_BRANDING);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewLogo, setPreviewLogo] = useState<string | null>(logoUrl || null);

  useEffect(() => {
    if (initialBranding) setBranding(initialBranding);
  }, [initialBranding]);

  useEffect(() => {
    setPreviewLogo(logoUrl || null);
  }, [logoUrl]);

  const updateColor = (
    mode: "light" | "dark",
    key: keyof BrandingConfig["light"],
    hex: string,
  ) => {
    setBranding((prev) => ({
      ...prev,
      [mode]: { ...prev[mode], [key]: hex },
    }));
  };

  const saveBranding = async () => {
    setSaving(true);
    try {
      await api.put("/settings/company/branding", branding);
      await refreshBranding();
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
      toast.success("Branding perusahaan berhasil disimpan");
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan branding");
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (file: File) => {
    setUploading(true);
    try {
      const token = localStorage.getItem("tara-token");
      const form = new FormData();
      form.append("logo", file);
      const res = await fetch("/api/settings/company/logo", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Gagal mengunggah logo");
      }
      const json = await res.json();
      setPreviewLogo(`${json.data.logo_url}?v=${Date.now()}`);
      await refreshBranding();
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
      toast.success("Logo berhasil diunggah");
    } catch (err: any) {
      toast.error(err.message || "Gagal mengunggah logo");
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = async () => {
    try {
      await api.delete("/settings/company/logo");
      setPreviewLogo(null);
      await refreshBranding();
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
      toast.success("Logo dihapus");
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus logo");
    }
  };

  return (
    <div className="space-y-6">
      {/* Logo */}
      <div className="surface-elevated p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Image className="h-4 w-4 text-gold" />
          <h3 className="text-sm font-semibold">Logo Perusahaan</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Logo tampil di sidebar, halaman login, dan footer aplikasi. Format PNG, JPG, WEBP, atau SVG (maks. 2 MB).
        </p>
        <div className="flex flex-wrap items-center gap-4">
          {previewLogo ? (
            <img src={previewLogo} alt="Logo" className="h-16 w-auto max-w-[200px] object-contain rounded-md border border-border p-2 bg-background" />
          ) : (
            <CompanyLogo size="lg" subtitle="" />
          )}
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadLogo(file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-gold/10 text-gold text-xs font-medium hover:bg-gold/20 disabled:opacity-50"
            >
              <Upload className="h-3.5 w-3.5" />
              {uploading ? "Mengunggah..." : "Unggah Logo"}
            </button>
            {previewLogo && (
              <button
                type="button"
                onClick={() => void removeLogo()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-destructive/30 text-destructive text-xs font-medium hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Hapus
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Colors */}
      <div className="surface-elevated p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-gold" />
          <h3 className="text-sm font-semibold">Warna Aplikasi</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-luxury text-muted-foreground">Tema Terang</p>
            <HexColorPicker label="Warna Primary" value={branding.light.primary} onChange={(v) => updateColor("light", "primary", v)} />
            <HexColorPicker label="Warna Background" value={branding.light.background} onChange={(v) => updateColor("light", "background", v)} />
            <HexColorPicker label="Warna Aksen" value={branding.light.accent} onChange={(v) => updateColor("light", "accent", v)} />
          </div>
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-luxury text-muted-foreground">Tema Gelap</p>
            <HexColorPicker label="Warna Primary" value={branding.dark.primary} onChange={(v) => updateColor("dark", "primary", v)} />
            <HexColorPicker label="Warna Background" value={branding.dark.background} onChange={(v) => updateColor("dark", "background", v)} />
            <HexColorPicker label="Warna Aksen" value={branding.dark.accent} onChange={(v) => updateColor("dark", "accent", v)} />
          </div>
        </div>
      </div>

      {/* Dark mode policy */}
      <div className="surface-elevated p-6 space-y-4">
        <h3 className="text-sm font-semibold">Mode Gelap</h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={branding.dark_mode_enabled}
            onChange={(e) =>
              setBranding((prev) => ({ ...prev, dark_mode_enabled: e.target.checked }))
            }
            className="h-4 w-4 rounded border-input"
          />
          <span className="text-sm">Izinkan pengguna memilih tema terang / gelap</span>
        </label>

        {branding.dark_mode_enabled ? (
          <div className="space-y-2 pl-7">
            <p className="text-xs text-muted-foreground">Tema default untuk pengguna baru:</p>
            <div className="flex gap-2">
              {(["light", "dark"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setBranding((prev) => ({ ...prev, default_theme: mode }))}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium border",
                    branding.default_theme === mode
                      ? "bg-gold/10 border-gold text-gold"
                      : "border-input hover:bg-accent",
                  )}
                >
                  {mode === "light" ? "Terang" : "Gelap"}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2 pl-7">
            <p className="text-xs text-muted-foreground">Tema yang dipaksa untuk semua pengguna:</p>
            <div className="flex gap-2">
              {(["light", "dark"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setBranding((prev) => ({ ...prev, forced_theme: mode }))}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium border",
                    branding.forced_theme === mode
                      ? "bg-gold/10 border-gold text-gold"
                      : "border-input hover:bg-accent",
                  )}
                >
                  {mode === "light" ? "Terang saja" : "Gelap saja"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => void saveBranding()}
        disabled={saving}
        className="px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
      >
        <Save className="h-3.5 w-3.5 inline mr-1.5" />
        {saving ? "Menyimpan..." : "Simpan Branding"}
      </button>
    </div>
  );
}
