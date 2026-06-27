import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  Bot, MessageSquare, ScrollText, Save, TestTube, Wifi, RefreshCw,
  Zap, Activity, ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export function AiLogsPage() {
  const [page, setPage] = useState(1);
  const { data: stats } = useQuery({
    queryKey: ["ai-log-stats"],
    queryFn: () => api.get("/admin/ai/logs/stats?days=30"),
  });
  const { data, isLoading } = useQuery({
    queryKey: ["ai-logs", page],
    queryFn: () => api.get(`/admin/ai/logs?page=${page}&limit=30`),
  });

  const logs = data?.data?.items || [];
  const pages = data?.data?.pages || 1;
  const s = stats?.data || {};

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-luxury-heading text-2xl">Log AI Agent</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Riwayat percakapan WhatsApp AI — retensi 90 hari
          </p>
        </div>
        <Link
          to="/web/settings"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← Pengaturan AI
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total (30 hari)", value: s.total_conversations ?? 0, icon: Activity },
          { label: "Sukses", value: s.success_count ?? 0, icon: Bot },
          { label: "Error", value: s.error_count ?? 0, icon: MessageSquare },
          { label: "Avg Latency", value: `${s.avg_latency_ms ?? 0}ms`, icon: Zap },
        ].map((item) => (
          <div key={item.label} className="surface-elevated p-4">
            <item.icon className="h-4 w-4 text-gold mb-2" />
            <p className="text-lg font-semibold">{item.value}</p>
            <p className="text-2xs text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="surface-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-left text-2xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Waktu</th>
                <th className="px-4 py-3 font-medium">Karyawan</th>
                <th className="px-4 py-3 font-medium">Pesan User</th>
                <th className="px-4 py-3 font-medium">Balasan AI</th>
                <th className="px-4 py-3 font-medium">Tools</th>
                <th className="px-4 py-3 font-medium">Tokens</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Memuat...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Belum ada log AI</td></tr>
              ) : logs.map((log: any) => (
                <tr key={log.id} className="border-b border-border/30 hover:bg-accent/30">
                  <td className="px-4 py-3 text-2xs whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString("id-ID")}
                  </td>
                  <td className="px-4 py-3">{log.employee?.full_name || "—"}</td>
                  <td className="px-4 py-3 max-w-[180px] truncate text-2xs">{log.user_message}</td>
                  <td className="px-4 py-3 max-w-[180px] truncate text-2xs">{log.assistant_message}</td>
                  <td className="px-4 py-3 text-2xs font-mono">
                    {(log.tools_called as string[])?.join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-2xs">
                    {(log.input_tokens || 0) + (log.output_tokens || 0)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-2xs px-2 py-0.5 rounded-full",
                      log.status === "success" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
                    )}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}
              className="flex items-center gap-1 text-xs disabled:opacity-40">
              <ChevronLeft className="h-3 w-3" /> Sebelumnya
            </button>
            <span className="text-2xs text-muted-foreground">{page} / {pages}</span>
            <button disabled={page >= pages} onClick={() => setPage(page + 1)}
              className="flex items-center gap-1 text-xs disabled:opacity-40">
              Selanjutnya <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** AI + WhatsApp settings section — used in SettingsPage */
export function AiAssistantSection() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["ai-config"],
    queryFn: () => api.get("/admin/ai/config"),
  });

  const [ai, setAi] = useState({
    enabled: false,
    provider: "tokease",
    api_key: "",
    base_url: "https://tokease.com/v1",
    model: "qwen3.7-plus",
    max_tokens: 1024,
    temperature: 0.3,
    response_language: "id",
    confirmation_timeout_minutes: 60,
    system_prompt_override: "",
  });

  const [wa, setWa] = useState({
    enabled: false,
    kapso_api_key: "",
    phone_number_id: "",
    business_number: "",
    webhook_verify_token: "",
  });

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!data?.data || loaded || isLoading) return;
    const cfg = data.data;
    setAi({
      enabled: cfg.ai?.enabled ?? false,
      provider: cfg.ai?.provider ?? "tokease",
      api_key: "",
      base_url: cfg.ai?.baseUrl ?? cfg.ai?.base_url ?? "https://tokease.com/v1",
      model: cfg.ai?.model ?? "qwen3.7-plus",
      max_tokens: cfg.ai?.maxTokens ?? cfg.ai?.max_tokens ?? 1024,
      temperature: cfg.ai?.temperature ?? 0.3,
      response_language: cfg.ai?.responseLanguage ?? cfg.ai?.response_language ?? "id",
      confirmation_timeout_minutes: cfg.ai?.confirmationTimeoutMinutes ?? cfg.ai?.confirmation_timeout_minutes ?? 60,
      system_prompt_override: cfg.ai?.systemPromptOverride ?? cfg.ai?.system_prompt_override ?? "",
    });
    setWa({
      enabled: cfg.whatsapp?.enabled ?? false,
      kapso_api_key: "",
      phone_number_id: cfg.whatsapp?.phoneNumberId ?? cfg.whatsapp?.phone_number_id ?? "",
      business_number: cfg.whatsapp?.businessNumber ?? cfg.whatsapp?.business_number ?? "",
      webhook_verify_token: cfg.whatsapp?.webhookVerifyToken ?? cfg.whatsapp?.webhook_verify_token ?? "",
    });
    setLoaded(true);
  }, [data, loaded, isLoading]);

  const save = async () => {
    try {
      const payload: any = {
        ai: {
          enabled: ai.enabled,
          provider: ai.provider,
          baseUrl: ai.base_url,
          model: ai.model,
          maxTokens: Number(ai.max_tokens),
          temperature: Number(ai.temperature),
          responseLanguage: ai.response_language,
          confirmationTimeoutMinutes: Number(ai.confirmation_timeout_minutes),
          systemPromptOverride: ai.system_prompt_override || undefined,
        },
        whatsapp: {
          enabled: wa.enabled,
          phoneNumberId: wa.phone_number_id,
          businessNumber: wa.business_number,
          webhookVerifyToken: wa.webhook_verify_token,
        },
      };
      if (ai.api_key) payload.ai.apiKey = ai.api_key;
      if (wa.kapso_api_key) payload.whatsapp.kapsoApiKey = wa.kapso_api_key;

      await api.put("/admin/ai/config", payload);
      toast.success("Konfigurasi AI & WhatsApp disimpan");
      queryClient.invalidateQueries({ queryKey: ["ai-config"] });
      setLoaded(false);
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan");
    }
  };

  const testAi = async () => {
    try {
      const res = await api.post("/admin/ai/test");
      if (res.data?.success) {
        toast.success(`Koneksi OK (${res.data.latencyMs}ms) — ${res.data.message}`);
      } else {
        toast.error(res.data?.message || "Koneksi gagal");
      }
    } catch (err: any) {
      toast.error(err.message || "Test gagal");
    }
  };

  const reindexSop = async () => {
    try {
      toast.info("Mengindeks ulang SOP...");
      const res = await api.post("/admin/ai/reindex-sop");
      toast.success(`Selesai: ${res.data?.documents} dokumen, ${res.data?.chunks} chunks`);
    } catch (err: any) {
      toast.error(err.message || "Re-index gagal");
    }
  };

  return (
    <div className="space-y-6">
      <div className="pb-2">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Bot className="h-4 w-4 text-gold" /> AI Assistant TARA
        </h2>
        <p className="text-2xs text-muted-foreground mt-0.5">
          Konfigurasi LLM, WhatsApp Kapso, dan bahasa respons
        </p>
      </div>

      {/* AI Config */}
      <div className="surface-elevated p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Aktifkan AI Assistant</p>
          <Toggle on={ai.enabled} onToggle={() => setAi({ ...ai, enabled: !ai.enabled })} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Inp label="Provider" value={ai.provider} onChange={(v) => setAi({ ...ai, provider: v })} />
          <Inp label="Model" value={ai.model} onChange={(v) => setAi({ ...ai, model: v })} placeholder="qwen3.7-plus" />
          <Inp label="Base URL" value={ai.base_url} onChange={(v) => setAi({ ...ai, base_url: v })} placeholder="https://tokease.com/v1" />
          <Inp label="API Key" value={ai.api_key} onChange={(v) => setAi({ ...ai, api_key: v })} placeholder="Kosongkan jika tidak diubah" />
          <Inp label="Max Tokens" value={String(ai.max_tokens)} onChange={(v) => setAi({ ...ai, max_tokens: Number(v) })} />
          <Inp label="Temperature" value={String(ai.temperature)} onChange={(v) => setAi({ ...ai, temperature: Number(v) })} />
          <div className="space-y-1.5">
            <label className="text-luxury-label">Bahasa Respons</label>
            <select value={ai.response_language} onChange={(e) => setAi({ ...ai, response_language: e.target.value })}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
              <option value="id">Bahasa Indonesia</option>
              <option value="en">English</option>
            </select>
          </div>
          <Inp label="Timeout Konfirmasi (menit)" value={String(ai.confirmation_timeout_minutes)}
            onChange={(v) => setAi({ ...ai, confirmation_timeout_minutes: Number(v) })} />
        </div>
        <div className="space-y-1.5">
          <label className="text-luxury-label">System Prompt Override (opsional)</label>
          <textarea value={ai.system_prompt_override} onChange={(e) => setAi({ ...ai, system_prompt_override: e.target.value })}
            rows={3} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none" />
        </div>
        <div className="flex gap-2">
          <button onClick={testAi} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-input text-xs hover:bg-accent">
            <TestTube className="h-3 w-3" /> Tes Koneksi AI
          </button>
          <button onClick={reindexSop} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-input text-xs hover:bg-accent">
            <RefreshCw className="h-3 w-3" /> Re-index SOP
          </button>
          <Link to="/web/ai-logs" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gold/30 text-xs text-gold hover:bg-gold/10">
            <ScrollText className="h-3 w-3" /> Lihat Log AI
          </Link>
        </div>
      </div>

      {/* WhatsApp Config */}
      <div className="surface-elevated p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> WhatsApp (Kapso)
          </p>
          <Toggle on={wa.enabled} onToggle={() => setWa({ ...wa, enabled: !wa.enabled })} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Inp label="Kapso API Key" value={wa.kapso_api_key} onChange={(v) => setWa({ ...wa, kapso_api_key: v })} placeholder="Kosongkan jika tidak diubah" />
          <Inp label="Phone Number ID" value={wa.phone_number_id} onChange={(v) => setWa({ ...wa, phone_number_id: v })} />
          <Inp label="Nomor WhatsApp Bisnis" value={wa.business_number} onChange={(v) => setWa({ ...wa, business_number: v })} placeholder="+628xxx" />
          <Inp label="Webhook Verify Token" value={wa.webhook_verify_token} onChange={(v) => setWa({ ...wa, webhook_verify_token: v })} />
        </div>
        <p className="text-2xs text-muted-foreground">
          Webhook URL: <code className="font-mono bg-accent px-1 rounded">POST /api/whatsapp/webhook</code>
          — Karyawan wajib verifikasi OTP di profil mobile.
        </p>
      </div>

      <button onClick={save} className="px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
        <Save className="h-3.5 w-3.5 inline mr-1.5" />Simpan Konfigurasi AI
      </button>
    </div>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className={cn("relative inline-flex h-5 w-9 items-center rounded-full transition-colors", on ? "bg-gold" : "bg-muted")}>
      <span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform", on ? "translate-x-[18px]" : "translate-x-[3px]")} />
    </button>
  );
}

function Inp({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-luxury-label">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/20" />
    </div>
  );
}
