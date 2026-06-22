import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShoppingBag,
  Globe,
  Webhook,
  Copy,
  CheckCircle2,
  ArrowRight,
  ChevronLeft,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  ecommerceHubService,
  type CreateChannelPayload,
  type ChannelCreateResult,
} from "@/core/services/retail/ecommerceHubService";
import type { SessionContext } from "@/core/security/session";

const CHANNEL_TYPES = [
  {
    id: "MARKETPLACE",
    label: "Marketplace",
    desc: "Shopee, Tokopedia, Lazada, TikTok Shop — platform-specific API integration",
    icon: ShoppingBag,
    color: "blue",
    hint: "Requires a Seller ID and API credentials from the marketplace developer portal.",
  },
  {
    id: "HEADLESS",
    label: "Headless / Custom Storefront",
    desc: "Your own storefront: Vite, Next.js, Nuxt, React Native, Flutter",
    icon: Globe,
    color: "slate",
    hint: "A Client ID and secret will be generated. Use these to authenticate API calls from your frontend.",
  },
  {
    id: "WEBHOOK",
    label: "Webhook Bridge",
    desc: "Forward Zenvix events to any SaaS, ERP, or CMS via webhook",
    icon: Webhook,
    color: "emerald",
    hint: "Zenvix will generate a signing key and a listening endpoint. Configure your target URL in the channel settings after creation.",
  },
];

// Maps UI platform value → backend CHANNEL_ADAPTER_TYPES enum value
const ADAPTER_TYPE_MAP: Record<string, string> = {
  shopee: "SHOPEE",
  tokopedia: "TOKOPEDIA",
  lazada: "LAZADA",
  tiktok: "TIKTOK",
  woocommerce: "WOOCOMMERCE",
  shopify: "SHOPIFY",
  vite: "CUSTOM",
  "next-js": "CUSTOM",
  nuxt: "CUSTOM",
  "react-native": "CUSTOM",
  flutter: "CUSTOM",
  "generic-webhook": "CUSTOM",
  zapier: "CUSTOM",
  custom: "CUSTOM",
};

// Maps UI sync value → backend SYNC_FREQUENCIES enum value
const SYNC_FREQ_MAP: Record<string, string> = {
  "15min": "15min",
  "30min": "30min",
  "1h": "1h",
  "6h": "6h",
  "24h": "24h",
};

const PLATFORM_OPTIONS: Record<
  string,
  { value: string; label: string; hint?: string }[]
> = {
  MARKETPLACE: [
    {
      value: "shopee",
      label: "Shopee",
      hint: "Indonesia, Malaysia, Singapore, Thailand, Philippines, Vietnam",
    },
    {
      value: "tokopedia",
      label: "Tokopedia",
      hint: "Indonesia — requires Partner OAuth credentials",
    },
    {
      value: "lazada",
      label: "Lazada",
      hint: "Southeast Asia — requires App Key and Secret",
    },
    {
      value: "tiktok",
      label: "TikTok Shop",
      hint: "Global — requires App Key and Webhook Secret",
    },
    {
      value: "custom",
      label: "Other / Custom",
      hint: "Any marketplace with a public API",
    },
  ],
  HEADLESS: [
    {
      value: "vite",
      label: "Vite",
      hint: "Popular AI-assisted frontend framework. Generates CORS-whitelisted API key.",
    },
    {
      value: "next-js",
      label: "Next.js",
      hint: "React framework with app router support",
    },
    { value: "nuxt", label: "Nuxt", hint: "Vue.js framework with SSR support" },
    {
      value: "react-native",
      label: "React Native",
      hint: "iOS and Android mobile app",
    },
    {
      value: "flutter",
      label: "Flutter",
      hint: "Cross-platform mobile app (Dart)",
    },
    {
      value: "custom",
      label: "Custom API",
      hint: "Any HTTP client — use the generated API key in your auth header",
    },
  ],
  WEBHOOK: [
    {
      value: "generic-webhook",
      label: "Generic Webhook",
      hint: "POST JSON events to any URL",
    },
    {
      value: "zapier",
      label: "Zapier",
      hint: "Trigger Zaps from Zenvix events",
    },
    {
      value: "custom",
      label: "Custom",
      hint: "BYO endpoint — all config done in channel settings",
    },
  ],
};

interface Props {
  open: boolean;
  onClose: () => void;
  session: SessionContext;
  onCreated: () => void;
}

export const CreateChannelDialog: React.FC<Props> = ({
  open,
  onClose,
  session,
  onCreated,
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedType, setSelectedType] = useState<string>("");
  const [form, setForm] = useState({
    name: "",
    platform: "",
    syncFrequency: "1h", // backend values: 15min, 30min, 1h, 6h, 24h
  });
  const [result, setResult] = useState<ChannelCreateResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const reset = () => {
    setStep(1);
    setSelectedType("");
    setForm({ name: "", platform: "", syncFrequency: "1h" });
    setResult(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleCreate = async () => {
    setIsSaving(true);
    try {
      // Map UI values → backend enum values
      const adapterType = ADAPTER_TYPE_MAP[form.platform] ?? "CUSTOM";
      const syncFrequency = SYNC_FREQ_MAP[form.syncFrequency] ?? "1h";

      const payload: CreateChannelPayload = {
        name: form.name,
        type: selectedType,
        adapterType,
        syncFrequency,
        integrationCategory:
          selectedType === "HEADLESS"
            ? "HEADLESS"
            : selectedType === "WEBHOOK"
              ? "PREMADE"
              : "PRESET",
      };
      const res = await ecommerceHubService.createChannel(session, payload);
      setResult(res);
      setStep(3);
      onCreated();
    } catch (err) {
      console.error(err);
      toast({ title: "Channel creation failed", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const copy = (value: string, field: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyAll = () => {
    if (!result) return;
    const text = `Client ID: ${result.plainClientId}\nClient Secret: ${result.plainClientSecret}`;
    navigator.clipboard.writeText(text);
    setCopiedField("all");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const platforms = PLATFORM_OPTIONS[selectedType] ?? [];
  const selectedPlatform = platforms.find((p) => p.value === form.platform);
  const valid2 = form.name.trim().length >= 2 && form.platform;
  const selectedChannelType = CHANNEL_TYPES.find((t) => t.id === selectedType);

  const STEP_LABELS = ["Channel Type", "Configuration", "Credentials"];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
        {/* Step indicator */}
        <div className="flex">
          {(Array.isArray(STEP_LABELS) ? STEP_LABELS : []).map((label, i) => {
            const s = i + 1;
            return (
              <div
                key={s}
                className={cn(
                  "flex-1 py-3 text-center text-[9px] font-black uppercase tracking-[0.2em] transition-colors border-b-2",
                  step === s
                    ? "bg-white text-foreground border-border"
                    : step > s
                      ? "bg-white text-success border-success"
                      : "bg-secondary/5 text-muted-foreground border-transparent",
                )}
              >
                <span
                  className={cn(
                    "inline-flex items-center justify-center w-4 h-4 rounded-full text-[8px] font-black mr-1.5 border",
                    step === s
                      ? "bg-secondary text-foreground border-border"
                      : step > s
                        ? "bg-success/10 text-success border-success"
                        : "bg-secondary/10 text-muted-foreground border-border",
                  )}
                >
                  {step > s ? "✓" : s}
                </span>
                {label}
              </div>
            );
          })}
        </div>

        <div className="p-8">
          {/* ── Step 1: Pick type ── */}
          {step === 1 && (
            <>
              <DialogHeader className="mb-6">
                <DialogTitle className="text-xl font-black italic tracking-tight">
                  Connect a Channel
                </DialogTitle>
                <DialogDescription className="font-bold italic text-xs text-muted-foreground uppercase tracking-widest">
                  Select the integration type to get started
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                {(Array.isArray(CHANNEL_TYPES) ? CHANNEL_TYPES : []).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedType(t.id)}
                    className={cn(
                      "w-full text-left flex items-start gap-4 p-5 rounded-2xl border-2 transition-all",
                      selectedType === t.id
                        ? "border-border bg-secondary/5 shadow-sm"
                        : "border-border hover:border-border bg-white hover:bg-secondary/5",
                    )}
                  >
                    <div
                      className={cn(
                        "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                        `bg-${t.color}-100`,
                      )}
                    >
                      <t.icon className={`w-5 h-5 text-${t.color}-600`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-black italic text-foreground text-sm">
                        {t.label}
                      </div>
                      <div className="text-xs font-bold text-muted-foreground mt-0.5 leading-relaxed">
                        {t.desc}
                      </div>
                      {selectedType === t.id && (
                        <div className="flex items-start gap-1.5 mt-2 text-[10px] font-bold text-muted-foreground italic">
                          <Info className="w-3 h-3 shrink-0 mt-0.5" /> {t.hint}
                        </div>
                      )}
                    </div>
                    {selectedType === t.id && (
                      <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                    )}
                  </button>
                ))}
              </div>
              <DialogFooter className="mt-6">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="rounded-xl font-black italic"
                >
                  Cancel
                </Button>
                <Button
                  disabled={!selectedType}
                  onClick={() => setStep(2)}
                  className="rounded-xl font-black italic gap-2 bg-secondary"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </DialogFooter>
            </>
          )}

          {/* ── Step 2: Configuration ── */}
          {step === 2 && (
            <>
              <DialogHeader className="mb-6">
                <DialogTitle className="text-xl font-black italic tracking-tight">
                  {selectedChannelType?.label ?? "Channel"} Config
                </DialogTitle>
                <DialogDescription className="font-bold italic text-xs text-muted-foreground uppercase tracking-widest">
                  Step 2 of 3 — Basic setup
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Channel Name *
                  </Label>
                  <Input
                    value={form.name}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder={
                      selectedType === "MARKETPLACE"
                        ? "e.g. Shopee Main Store"
                        : selectedType === "HEADLESS"
                          ? "e.g. Main Vite Storefront"
                          : "e.g. ERP Webhook Bridge"
                    }
                    className="h-12 rounded-xl font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Platform *
                    </Label>
                    <Select
                      value={form.platform}
                      onValueChange={(v) =>
                        setForm((p) => ({ ...p, platform: v }))
                      }
                    >
                      <SelectTrigger className="h-12 rounded-xl font-bold">
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                      <SelectContent>
                        {(Array.isArray(platforms) ? platforms : []).map((p) => (
                          <SelectItem
                            key={p.value}
                            value={p.value}
                            className="font-bold"
                          >
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Sync Frequency
                    </Label>
                    <Select
                      value={form.syncFrequency}
                      onValueChange={(v) =>
                        setForm((p) => ({ ...p, syncFrequency: v }))
                      }
                    >
                      <SelectTrigger className="h-12 rounded-xl font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          { value: "15min", label: "Every 15 min" },
                          { value: "30min", label: "Every 30 min" },
                          { value: "1h", label: "Every 1 hour" },
                          { value: "6h", label: "Every 6 hours" },
                          { value: "24h", label: "Every 24 hours" },
                        ].map((f) => (
                          <SelectItem
                            key={f.value}
                            value={f.value}
                            className="font-bold"
                          >
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Platform hint */}
                {selectedPlatform?.hint && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary">
                    <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-[11px] font-bold text-primary leading-relaxed">
                      {selectedPlatform.hint}
                    </p>
                  </div>
                )}

                {/* Webhook type notice */}
                {selectedType === "WEBHOOK" && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-success border border-success">
                    <Info className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    <p className="text-[11px] font-bold text-success leading-relaxed">
                      After creation, go to <strong>Settings → Webhooks</strong>{" "}
                      to configure your target URL, auth headers, and event
                      forwarding rules.
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter className="mt-6">
                <Button
                  variant="ghost"
                  onClick={() => setStep(1)}
                  className="rounded-xl font-black italic gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  disabled={!valid2 || isSaving}
                  onClick={handleCreate}
                  className="rounded-xl font-black italic bg-secondary"
                >
                  {isSaving ? "Creating…" : "Create Channel"}
                </Button>
              </DialogFooter>
            </>
          )}

          {/* ── Step 3: Credentials ── */}
          {step === 3 && result && (
            <>
              <DialogHeader className="mb-6">
                <div className="w-12 h-12 rounded-2xl bg-success flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-6 h-6 text-success" />
                </div>
                <DialogTitle className="text-xl font-black italic tracking-tight">
                  Channel Created!
                </DialogTitle>
                <DialogDescription className="font-bold italic text-xs text-muted-foreground uppercase tracking-widest">
                  Copy credentials now — they won't be shown again
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                {[
                  {
                    label: "Client ID",
                    value: result.plainClientId,
                    field: "id",
                  },
                  {
                    label: "Client Secret",
                    value: result.plainClientSecret,
                    field: "secret",
                  },
                ].map((item) => (
                  <div key={item.field} className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      {item.label}
                    </Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs font-mono bg-secondary/5 border border-border rounded-xl px-4 py-3 truncate text-muted-foreground">
                        {item.value}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copy(item.value, item.field)}
                        className="rounded-xl shrink-0"
                      >
                        {copiedField === item.field ? (
                          <CheckCircle2 className="w-4 h-4 text-success" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}

                <Button
                  variant="outline"
                  onClick={copyAll}
                  className="w-full h-10 rounded-xl font-black italic text-xs uppercase tracking-widest gap-2 border-border"
                >
                  {copiedField === "all" ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-success" />{" "}
                      Copied All!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Copy Both
                    </>
                  )}
                </Button>

                <div className="bg-warning border border-warning rounded-xl p-4 text-[11px] font-bold italic text-warning leading-relaxed">
                  ⚠ Store these credentials securely (e.g. in your .env file).
                  They cannot be retrieved after closing this dialog. You can
                  rotate them later in <strong>Danger Zone</strong>.
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button
                  onClick={handleClose}
                  className="w-full rounded-xl font-black italic bg-secondary"
                >
                  Done — View Channel Settings
                </Button>
              </DialogFooter>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
