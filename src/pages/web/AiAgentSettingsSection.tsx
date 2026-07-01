import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  Bot, MessageSquare, ScrollText, Save, TestTube, RefreshCw,
  Sparkles, Wrench, RotateCcw, ChevronDown, ChevronUp, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

type AiSkill = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  tools: string[];
  promptAddon?: string;
  requiresElevatedAccess?: boolean;
};

type AgentTab = "config" | "prompt" | "skills";

export function AiAgentSettingsSection() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<AgentTab>("config");
  const { data, isLoading } = useQuery({
    queryKey: ["ai-config"],
    queryFn: () => api.get("/admin/ai/config"),
  });

  const [ai, setAi] = useState({
    enabled: false,
    provider: "openrouter",
    api_key: "",
    base_url: "https://openrouter.ai/api/v1",
    model: "deepseek-v4-flash",
    max_tokens: 1024,
    temperature: 0.3,
    response_language: "id",
    confirmation_timeout_minutes: 60,
    system_prompt_override: "",
    system_prompt: "",
  });

  const [skills, setSkills] = useState<AiSkill[]>([]);
  const [wa, setWa] = useState({
    enabled: false,
    kapso_api_key: "",
    phone_number_id: "",
    business_number: "",
    webhook_verify_token: "",
  });
  const [defaults, setDefaults] = useState<{ systemPrompt: string; skills: AiSkill[]; placeholders: string[] } | null>(null);
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!data?.data || loaded || isLoading) return;
    const cfg = data.data;
    setDefaults(cfg.agentDefaults ?? null);
    setAi({
      enabled: cfg.ai?.enabled ?? false,
      provider: cfg.ai?.provider ?? "openrouter",
      api_key: "",
      base_url: cfg.ai?.baseUrl ?? cfg.ai?.base_url ?? "https://openrouter.ai/api/v1",
      model: cfg.ai?.model ?? "deepseek-v4-flash",
      max_tokens: cfg.ai?.maxTokens ?? cfg.ai?.max_tokens ?? 1024,
      temperature: cfg.ai?.temperature ?? 0.3,
      response_language: cfg.ai?.responseLanguage ?? cfg.ai?.response_language ?? "id",
      confirmation_timeout_minutes: cfg.ai?.confirmationTimeoutMinutes ?? cfg.ai?.confirmation_timeout_minutes ?? 60,
      system_prompt_override: cfg.ai?.systemPromptOverride ?? cfg.ai?.system_prompt_override ?? "",
      system_prompt: cfg.ai?.systemPrompt ?? cfg.ai?.system_prompt ?? cfg.agentDefaults?.systemPrompt ?? "",
    });
    setSkills(cfg.ai?.skills ?? cfg.agentDefaults?.skills ?? []);
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
          systemPrompt: ai.system_prompt,
          skills,
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
      toast.success("Konfigurasi AI Agent disimpan");
      queryClient.invalidateQueries({ queryKey: ["ai-config"] });
      setLoaded(false);
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan");
    }
  };

  const resetAgentDefaults = async () => {
    if (!confirm("Reset system prompt dan skills ke default? Perubahan kustom akan hilang.")) return;
    try {
      const res = await api.post("/admin/ai/reset-agent-defaults");
      toast.success(res.message || "Direset ke default");
      queryClient.invalidateQueries({ queryKey: ["ai-config"] });
      setLoaded(false);
    } catch (err: any) {
      toast.error(err.message || "Gagal reset");
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

  const updateSkill = (id: string, patch: Partial<AiSkill>) => {
    setSkills((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const tabs: { id: AgentTab; label: string; icon: typeof Bot }[] = [
    { id: "config", label: "Konfigurasi", icon: Wrench },
    { id: "prompt", label: "System Prompt", icon: Sparkles },
    { id: "skills", label: "Skills", icon: Bot },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Bot className="h-4 w-4 text-gold" /> AI Agent TARA
          </h2>
          <p className="text-2xs text-muted-foreground mt-0.5">
            Kelola LLM, system prompt, skills, dan WhatsApp Kapso
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={resetAgentDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-input text-xs hover:bg-accent"
          >
            <RotateCcw className="h-3 w-3" /> Reset Prompt & Skills
          </button>
          <Link
            to="/web/ai-logs"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gold/30 text-xs text-gold hover:bg-gold/10"
          >
            <ScrollText className="h-3 w-3" /> Log AI
          </Link>
        </div>
      </div>

      <div className="flex gap-1 p-1 rounded-lg bg-secondary/50 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              tab === t.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "config" && (
        <>
          <div className="surface-elevated p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Aktifkan AI Agent</p>
              <Toggle on={ai.enabled} onToggle={() => setAi({ ...ai, enabled: !ai.enabled })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Inp label="Provider" value={ai.provider} onChange={(v) => setAi({ ...ai, provider: v })} />
              <Inp label="Model" value={ai.model} onChange={(v) => setAi({ ...ai, model: v })} />
              <Inp label="Base URL" value={ai.base_url} onChange={(v) => setAi({ ...ai, base_url: v })} />
              <Inp label="API Key" value={ai.api_key} onChange={(v) => setAi({ ...ai, api_key: v })} placeholder="Kosongkan jika tidak diubah" />
              <Inp label="Max Tokens" value={String(ai.max_tokens)} onChange={(v) => setAi({ ...ai, max_tokens: Number(v) })} />
              <Inp label="Temperature" value={String(ai.temperature)} onChange={(v) => setAi({ ...ai, temperature: Number(v) })} />
              <div className="space-y-1.5">
                <label className="text-luxury-label">Bahasa Respons</label>
                <select
                  value={ai.response_language}
                  onChange={(e) => setAi({ ...ai, response_language: e.target.value })}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="id">Bahasa Indonesia</option>
                  <option value="en">English</option>
                </select>
              </div>
              <Inp
                label="Timeout Konfirmasi (menit)"
                value={String(ai.confirmation_timeout_minutes)}
                onChange={(v) => setAi({ ...ai, confirmation_timeout_minutes: Number(v) })}
              />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={testAi} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-input text-xs hover:bg-accent">
                <TestTube className="h-3 w-3" /> Tes Koneksi AI
              </button>
              <button type="button" onClick={reindexSop} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-input text-xs hover:bg-accent">
                <RefreshCw className="h-3 w-3" /> Re-index SOP
              </button>
            </div>
          </div>

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
              <Inp label="Nomor WhatsApp Bisnis" value={wa.business_number} onChange={(v) => setWa({ ...wa, business_number: v })} />
              <Inp label="Webhook Verify Token" value={wa.webhook_verify_token} onChange={(v) => setWa({ ...wa, webhook_verify_token: v })} />
            </div>
          </div>
        </>
      )}

      {tab === "prompt" && (
        <div className="surface-elevated p-5 space-y-4">
          <div>
            <p className="text-sm font-medium">System Prompt Template</p>
            <p className="text-2xs text-muted-foreground mt-1">
              Template utama perilaku AI. Placeholder dinamis diganti otomatis saat chat.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(defaults?.placeholders || []).map((ph) => (
              <code key={ph} className="text-2xs bg-accent px-1.5 py-0.5 rounded font-mono">
                {ph}
              </code>
            ))}
          </div>

          <textarea
            value={ai.system_prompt}
            onChange={(e) => setAi({ ...ai, system_prompt: e.target.value })}
            rows={18}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-mono leading-relaxed resize-y min-h-[320px]"
          />

          <div className="space-y-1.5">
            <label className="text-luxury-label">Instruksi Tambahan (opsional)</label>
            <textarea
              value={ai.system_prompt_override}
              onChange={(e) => setAi({ ...ai, system_prompt_override: e.target.value })}
              rows={3}
              placeholder="Ditambahkan di akhir prompt — misalnya kebijakan khusus perusahaan"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
            />
          </div>
        </div>
      )}

      {tab === "skills" && (
        <div className="space-y-3">
          <p className="text-2xs text-muted-foreground">
            Skills mengontrol kemampuan AI dan tools yang tersedia. Nonaktifkan skill untuk menonaktifkan tools terkait.
          </p>
          {skills.map((skill) => {
            const open = expandedSkill === skill.id;
            return (
              <div key={skill.id} className="surface-elevated overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <Toggle
                    on={skill.enabled}
                    onToggle={() => updateSkill(skill.id, { enabled: !skill.enabled })}
                  />
                  <button
                    type="button"
                    className="flex-1 text-left"
                    onClick={() => setExpandedSkill(open ? null : skill.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{skill.name}</span>
                      {skill.requiresElevatedAccess && (
                        <span className="inline-flex items-center gap-0.5 text-2xs px-1.5 py-0.5 rounded bg-gold/10 text-gold">
                          <Shield className="h-3 w-3" /> Supervisor/HR
                        </span>
                      )}
                    </div>
                    <p className="text-2xs text-muted-foreground mt-0.5 line-clamp-1">{skill.description}</p>
                  </button>
                  <button type="button" onClick={() => setExpandedSkill(open ? null : skill.id)} className="p-1">
                    {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>

                {open && (
                  <div className="px-4 pb-4 pt-0 space-y-3 border-t border-border/50">
                    <Inp label="Nama Skill" value={skill.name} onChange={(v) => updateSkill(skill.id, { name: v })} />
                    <div className="space-y-1.5">
                      <label className="text-luxury-label">Deskripsi</label>
                      <textarea
                        value={skill.description}
                        onChange={(e) => updateSkill(skill.id, { description: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-luxury-label">Instruksi Tambahan Skill</label>
                      <textarea
                        value={skill.promptAddon || ""}
                        onChange={(e) => updateSkill(skill.id, { promptAddon: e.target.value })}
                        rows={3}
                        placeholder="Instruksi khusus saat skill ini aktif"
                        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-luxury-label">Tools (read-only)</label>
                      <div className="flex flex-wrap gap-1.5">
                        {skill.tools.map((tool) => (
                          <code key={tool} className="text-2xs bg-secondary px-2 py-1 rounded font-mono">
                            {tool}
                          </code>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={save}
        className="px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
      >
        <Save className="h-3.5 w-3.5 inline mr-1.5" />
        Simpan AI Agent
      </button>
    </div>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn("relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0", on ? "bg-gold" : "bg-muted")}
    >
      <span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform", on ? "translate-x-[18px]" : "translate-x-[3px]")} />
    </button>
  );
}

function Inp({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-luxury-label">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/20"
      />
    </div>
  );
}
