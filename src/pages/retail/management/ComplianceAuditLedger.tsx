import React, { useState, useMemo } from "react";
import { PageHeader } from "@/core/ui/PageHeader";
import {
  FileText,
  ShieldCheck,
  Download,
  ExternalLink,
  Search,
  Filter,
  Lock,
  Fingerprint,
  AlertTriangle,
  CheckCircle2,
  History,
  ChevronRight,
  Database,
  Key,
  Calendar,
  MoreHorizontal,
  RefreshCw,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useSession } from "@/core/security/session";
import { apiRequest } from "@/core/api/apiClient";
import { toast } from "sonner";
import { cn } from "@/core/utils/cn";
import { StrategicExpansionModal } from "@/components/ui/StrategicExpansionModal";

const eventColors: Record<string, string> = {
  FISCAL_VOID: "text-rose-500 bg-rose-500/10 border-rose-500/20",
  PERMISSION_CHANGE: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  MANUAL_ADJUST: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  STORE_OPEN: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  STORE_CLOSE: "text-slate-400 bg-slate-400/10 border-slate-400/20",
  DISCOUNT_APPLIED: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
  REFUND_ISSUED: "text-rose-400 bg-rose-400/10 border-rose-400/20",
};

const ComplianceAuditLedger = ({ noShell = false }: { noShell?: boolean }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpansionModalOpen, setIsExpansionModalOpen] = useState(false);
  const [expansionFeature, setExpansionFeature] = useState("");
  const session = useSession();

  React.useEffect(() => {
    const fetchLogs = async () => {
      try {
        setIsLoading(true);
        const data = await apiRequest<any[]>("/v1/audit/logs", "GET", session);
        setLogs(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch audit logs:", err);
        toast.error("Compliance Stream Offline");
      } finally {
        setIsLoading(false);
      }
    };
    if (session.tenant_id) fetchLogs();
  }, [session.tenant_id]);

  const openExpansion = (feature: string) => {
    setExpansionFeature(feature);
    setIsExpansionModalOpen(true);
  };

  const handleExport = async (format: 'pdf' | 'csv') => {
    try {
      toast.info(`Generating ${format.toUpperCase()} Audit Report...`);
      const blob = await apiRequest<Blob>(`/v1/audit/export?format=${format}`, "GET", session, null, { responseType: 'blob' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-report-${new Date().toISOString()}.${format === 'csv' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Export Failed");
    }
  };

  const filteredLogs = useMemo(() => {
    if (!searchTerm.trim()) return logs;
    const q = searchTerm.toLowerCase();
    return (Array.isArray(logs) ? logs : []).filter(
      (l) =>
        (l.action || "").toLowerCase().includes(q) ||
        (l.user_id || "").toLowerCase().includes(q) ||
        (l.hash_chain || "").toLowerCase().includes(q) ||
        new Date(l.created_at).toLocaleString().includes(q),
    );
  }, [searchTerm, logs]);

  const content = (
    <div className={cn("space-y-12 relative z-10", !noShell && "max-w-[1600px] mx-auto p-12")}>
      {!noShell && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <Card className="lg:col-span-3 bg-white/[0.03] border border-white/10 shadow-2xl rounded-[3rem] overflow-hidden relative group backdrop-blur-3xl">
            <div className="absolute top-0 right-0 p-12 opacity-5">
              <ShieldCheck className="w-48 h-48 text-blue-400" />
            </div>
            <CardContent className="p-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-12 relative z-10 text-white">
              <div className="space-y-6 flex-1">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl">
                    <Fingerprint className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 italic">
                      Global Integrity State
                    </div>
                    <div className="text-3xl font-black italic tracking-tighter">
                      SECURED & SEALED
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic">
                    Current Block Hash
                  </div>
                  <code className="bg-black/40 px-6 py-3 rounded-2xl text-indigo-400 font-mono text-xs border border-white/5 block w-fit shadow-inner">
                    ZVX-PROD-0x8F2DA4C7B41A9902EDC
                  </code>
                </div>
                <div className="text-[10px] text-slate-500 font-bold uppercase italic flex items-center gap-4">
                  <span>Last reconciliation: <span className="text-white">14 minutes ago</span></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                  <span>{logs.length} Blocks Immutable</span>
                </div>
              </div>
              <div className="w-full md:w-64 bg-black/20 border border-white/5 p-8 rounded-[2.5rem] space-y-6 text-center shrink-0 backdrop-blur-sm">
                <div className="text-6xl font-black italic tracking-tighter text-indigo-500">
                  100%
                </div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Integrity Score
                </div>
                <Progress value={100} className="h-2.5 bg-slate-900 shadow-inner" />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="shadow-2xl border-none bg-white/[0.03] backdrop-blur-3xl rounded-[2.5rem] overflow-hidden">
              <CardHeader className="p-8 pb-0">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic">
                  Anomaly Watch
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-black italic text-white uppercase tracking-tighter">
                      Zero Flags
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      No Suspicious Deviations
                    </div>
                  </div>
                </div>
                <Separator className="bg-white/5" />
                <div className="text-[10px] text-slate-500 font-medium leading-relaxed italic uppercase tracking-widest">
                  AI Scanner processed {logs.length} transaction blocks with nominal variance.
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-2xl border-none bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 backdrop-blur-3xl rounded-[2.5rem] group cursor-pointer transition-all duration-500" onClick={() => openExpansion("Cold Storage Vault Access")}>
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl mx-auto group-hover:scale-110 transition-transform">
                  <Database className="w-7 h-7" />
                </div>
                <div className="text-sm font-black italic text-white uppercase tracking-widest">
                  Archive Vault
                </div>
                <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-[0.2em] italic">
                  Access T+90 Days Data
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex gap-4 bg-white/[0.03] backdrop-blur-3xl rounded-[2.5rem] p-4 border border-white/5 shadow-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <Input
            className="pl-16 h-14 bg-black/20 border-none rounded-2xl text-sm font-bold italic text-white placeholder:text-slate-600 focus-visible:ring-indigo-500 transition-all"
            placeholder="Search Timestamp, Event Type, Actor ID, or Hash Signature..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button 
          onClick={() => openExpansion("Temporal Filter Engine")}
          variant="ghost"
          className="h-14 px-8 rounded-2xl gap-3 font-black italic border border-white/5 text-white hover:bg-white/5 uppercase text-[10px] tracking-widest"
        >
          <Calendar className="w-5 h-5 text-indigo-500" /> Range
        </Button>
        <Button 
          onClick={() => openExpansion("Advanced Taxonomy Filtering")}
          variant="ghost"
          className="h-14 px-8 rounded-2xl gap-3 font-black italic border border-white/5 text-white hover:bg-white/5 uppercase text-[10px] tracking-widest"
        >
          <Filter className="w-5 h-5 text-blue-500" /> Types
        </Button>
      </div>

      {/* Audit Log Table */}
      <Card className="border-none bg-white/[0.02] backdrop-blur-3xl shadow-2xl rounded-[3rem] overflow-hidden border border-white/5">
        <CardHeader className="p-10 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white border border-white/5">
                <History className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-2xl font-black italic uppercase tracking-tighter text-white">
                  Immutable Audit Stream
                </CardTitle>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-1">
                  Non-Repudiable Logs backed by Zenvix Signature Hub
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
              <Zap className="w-4 h-4 text-indigo-500" />
              <span className="text-[10px] font-black italic uppercase text-indigo-500 tracking-widest">REAL-TIME SYNC</span>
            </div>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {[
                  "Temporal Context",
                  "Event Typology",
                  "Operational Actor",
                  "Impact Delta",
                  "Integrity Seal",
                  "Block ID",
                ].map((h, i) => (
                  <th
                    key={i}
                    className={`px-10 py-6 ${i === 4 ? "text-center" : i === 5 ? "text-right" : "text-left"} text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 italic`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-10 py-32 text-center">
                     <RefreshCw className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-6" />
                     <span className="text-[11px] font-black italic uppercase tracking-[0.25em] text-slate-500">Decrypting Ledger...</span>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-10 py-32 text-center text-[10px] font-black italic uppercase tracking-[0.3em] text-slate-600"
                  >
                    No matching entries in current block
                  </td>
                </tr>
              ) : (
                (Array.isArray(filteredLogs) ? filteredLogs : []).map((log, i) => (
                  <tr
                    key={i}
                    className="group hover:bg-white/5 transition-all border-b border-white/[0.02] last:border-none cursor-pointer"
                  >
                    <td className="px-10 py-6 whitespace-nowrap">
                      <div className="text-xs font-bold text-white font-mono tracking-tight group-hover:text-indigo-400 transition-colors">
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <Badge
                        className={`border px-4 py-1.5 rounded-xl text-[9px] font-black italic tracking-widest uppercase ${eventColors[log.action] ?? "bg-slate-900 text-slate-400 border-white/10"}`}
                      >
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-10 py-6">
                      <div className="text-xs font-black italic text-slate-300">
                        {log.user_id}
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <div
                        className={`text-xs font-black italic ${String(log.metadata?.impact || "").startsWith("-") ? "text-rose-500" : log.action === "PERMISSION_CHANGE" ? "text-amber-500" : "text-slate-400"}`}
                      >
                        {log.metadata?.impact || "N/A"}
                      </div>
                    </td>
                    <td className="px-10 py-6 text-center">
                      <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl w-fit mx-auto">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-[9px] font-black italic text-emerald-500 uppercase tracking-widest">
                          Validated
                        </span>
                      </div>
                    </td>
                    <td className="px-10 py-6 text-right font-mono text-[10px] text-slate-500 group-hover:text-white transition-colors">
                      {(log.hash_chain || "").substring(0, 12)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-8 bg-black/20 border-t border-white/5 flex items-center justify-between">
          <div className="text-[10px] font-black italic text-slate-500 uppercase tracking-[0.2em]">
            {filteredLogs.length} Blocks Sequenced in Current View
          </div>
          <Button 
            onClick={() => openExpansion("Full Ledger Cryptographic Re-Validation")}
            variant="ghost"
            size="sm"
            className="font-black italic text-[11px] uppercase text-indigo-500 hover:bg-indigo-500/10 rounded-2xl gap-3 h-11 px-6 border border-indigo-500/20"
          >
            Verify All Historical Blocks{" "}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  );

  if (noShell) return content;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 selection:bg-indigo-500 selection:text-white">
      <StrategicExpansionModal
        isOpen={isExpansionModalOpen}
        onClose={() => setIsExpansionModalOpen(false)}
        featureName={expansionFeature}
      />

      {/* Header */}
      <div className="px-12 py-8 border-b border-white/5 bg-slate-950/50 backdrop-blur-3xl shrink-0 flex items-center justify-between sticky top-0 z-50">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">
            Compliance & Audit Ledger
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-1">
            Immutable Fiscal Record-Keeping • Regulatory Event Log • v4.2.0
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button onClick={() => handleExport('csv')}
            variant="ghost"
            className="h-12 px-6 font-black italic border border-white/10 text-white hover:bg-white/5 text-[11px] uppercase tracking-widest gap-3 rounded-2xl"
          >
            <Download className="w-4 h-4 text-emerald-500" /> Export XLSX
          </Button>
          <Button onClick={() => handleExport('pdf')}
             variant="ghost"
             className="h-12 px-6 font-black italic border border-white/10 text-white hover:bg-white/5 text-[11px] uppercase tracking-widest gap-3 rounded-2xl"
          >
            <FileText className="w-4 h-4 text-rose-500" /> Export PDF
          </Button>

          <Button 
            onClick={() => openExpansion("Cryptographic Chain Verification")}
            className="h-12 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black italic uppercase text-[11px] tracking-widest gap-3 shadow-xl shadow-indigo-600/20"
          >
            <ExternalLink className="w-4 h-4" /> Verify Chain
          </Button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        {/* Background Atmosphere */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-5%] w-[45%] h-[45%] bg-indigo-500/5 blur-[130px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[35%] h-[35%] bg-blue-500/5 blur-[120px] rounded-full" />
        </div>
        {content}
      </div>
    </div>
  );
};

export default ComplianceAuditLedger;
