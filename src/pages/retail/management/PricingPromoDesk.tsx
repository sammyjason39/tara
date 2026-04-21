import React, { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/core/ui/PageHeader";
import {
  Tag,
  Zap,
  Percent,
  ShieldCheck,
  TrendingUp,
  BarChart3,
  ChevronRight,
  Plus,
  Search,
  CheckSquare,
  Play,
  RotateCcw,
  Target,
  FileText,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { retailService } from "@/core/services/retail/retailService";
import { useSession } from "@/core/security/session";
import type { RetailPromotion } from "@/core/types/retail/retail";
import { cn } from "@/lib/utils";

import { ApprovalMatrix } from "./pricing-promo-desk/components/ApprovalMatrix";
import { AuditTrailModal } from "./pricing-promo-desk/components/AuditTrailModal";
import { BufferCollisionSensor } from "./pricing-promo-desk/components/BufferCollisionSensor";
import { useGovernance } from "./pricing-promo-desk/hooks/useGovernance";

const PricingPromoDesk = () => {
  const session = useSession();
  const [promotions, setPromotions] = useState<RetailPromotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Single Selection for Governance Focus (to keep the engine simple and robust)
  const [focusedPromoId, setFocusedPromoId] = useState<string | null>(null);

  // Modals state
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // Initialize the Governance Engine
  const {
    state: govState,
    auditLog,
    addSignature,
    toggleBypassMode,
    setBypassReason,
    executePromo,
  } = useGovernance(
    focusedPromoId || "",
    session.tenantId || "tenant",
    session,
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const data = await retailService.listPromotions(
          session.tenantId!,
          session,
        );
        const fetchedPromos = Array.isArray(data) ? data : [];
        setPromotions(fetchedPromos);
        if (fetchedPromos.length > 0) {
          setFocusedPromoId(fetchedPromos[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch promotions", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [session.tenantId, session]);

  const stats = useMemo(() => {
    const active = promotions.filter((p) => p.status === "active").length;
    const marginImpact = -2.4; // Mocked aggregate impact
    const pending = promotions.filter((p) => p.status === "draft").length;

    return { active, marginImpact, pending };
  }, [promotions]);

  const focusedPromo = useMemo(() => {
    return promotions.find((p) => p.id === focusedPromoId) || null;
  }, [promotions, focusedPromoId]);

  const handleExecute = async () => {
    const success = await executePromo();
    if (success && focusedPromo) {
      // Optimistically update the promotion status locally
      setPromotions((prev) =>
        prev.map((p) =>
          p.id === focusedPromo.id
            ? { ...p, status: "active" as RetailPromotion["status"] }
            : p,
        ),
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-4">
          <RotateCcw className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-black italic uppercase tracking-widest text-slate-400">
            Calibrating Governance Ledger...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] overflow-hidden bg-slate-50">
      <div className="px-8 py-6 border-b bg-white shrink-0 flex items-center justify-between">
        <PageHeader
          title="Revenue Control Desk"
          subtitle={`Governance Layer: SECURED • Margin Integrity: ${stats.marginImpact > -3 ? "OPTIMAL" : "CRITICAL"}`}
        />
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setIsAuditModalOpen(true)}
            disabled={!focusedPromoId}
            className="h-11 rounded-xl px-4 font-black italic border-slate-200 text-xs uppercase tracking-widest gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700"
          >
            <FileText className="w-4 h-4 text-blue-600" /> View Immutable Ledger
          </Button>
          <Button disabled title="Not available yet" className="h-11 px-6 rounded-xl bg-slate-900 font-black italic uppercase text-xs tracking-widest gap-2">
            <Plus className="w-4 h-4" /> Issue Proposal
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 lg:p-12">
        <div className="max-w-[1400px] mx-auto space-y-10">
          {/* Top KPI row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="rounded-[2.5rem] p-6 bg-white border-none shadow-[0_10px_40px_rgba(0,0,0,0.04)] border-l-[6px] border-l-blue-600">
              <div className="flex justify-between items-start mb-6">
                <div className="p-4 rounded-2xl bg-blue-50 text-blue-600">
                  <Percent className="w-5 h-5" />
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 font-black italic text-[8px] uppercase tracking-widest border-none">
                  LIVE
                </Badge>
              </div>
              <div className="text-[10px] font-black italic uppercase tracking-widest text-slate-400 mb-1">
                Active Tactical Pricing
              </div>
              <div className="text-3xl font-black italic tracking-tighter text-slate-900">
                {stats.active} Promos
              </div>
            </Card>

            <Card className="rounded-[2.5rem] p-6 bg-white border-none shadow-[0_10px_40px_rgba(0,0,0,0.04)] border-l-[6px] border-l-amber-500">
              <div className="flex justify-between items-start mb-6">
                <div className="p-4 rounded-2xl bg-amber-50 text-amber-600">
                  <Zap className="w-5 h-5" />
                </div>
                <Badge
                  variant="destructive"
                  className="font-black italic text-[8px] tracking-widest border-none"
                >
                  URGENT
                </Badge>
              </div>
              <div className="text-[10px] font-black italic uppercase tracking-widest text-slate-400 mb-1">
                Pending Governance
              </div>
              <div className="text-3xl font-black italic tracking-tighter text-slate-900">
                {stats.pending} Requests
              </div>
            </Card>

            <Card className="rounded-[2.5rem] p-6 bg-white border-none shadow-[0_10px_40px_rgba(0,0,0,0.04)] border-l-[6px] border-l-indigo-600">
              <div className="flex justify-between items-start mb-6">
                <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <Badge className="bg-indigo-50 text-indigo-700 font-black italic text-[8px] uppercase tracking-widest border-none">
                  AGGREGATE
                </Badge>
              </div>
              <div className="text-[10px] font-black italic uppercase tracking-widest text-slate-400 mb-1">
                Margin Erosion Base
              </div>
              <div className="text-3xl font-black italic tracking-tighter text-slate-900">
                {stats.marginImpact}%
              </div>
            </Card>

            <Card className="rounded-[2.5rem] p-6 bg-slate-900 text-white shadow-2xl relative overflow-hidden group">
              <ShieldCheck className="absolute -right-8 -bottom-8 w-32 h-32 opacity-10 group-hover:scale-110 transition-transform" />
              <div className="relative z-10">
                <div className="text-[10px] font-black italic uppercase tracking-widest text-blue-400 mb-4">
                  Guardrail Status
                </div>
                <div className="text-4xl font-black italic tracking-tighter">
                  SECURED
                </div>
                <div className="text-[10px] font-bold italic opacity-60 mt-4 uppercase">
                  No Policy Violations
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Promotion List */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <Card className="rounded-[2.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.05)] border-none bg-white flex flex-col flex-1 h-[600px]">
                <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between shrink-0">
                  <h3 className="text-xs font-black italic uppercase tracking-widest text-slate-500">
                    Registry
                  </h3>
                </div>
                <div className="p-4 shrink-0 bg-slate-50">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      className="pl-12 h-11 bg-white border-slate-200 rounded-2xl text-xs font-bold italic"
                      placeholder="Search Strategy..."
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                  {promotions.map((promo) => (
                    <div
                      key={promo.id}
                      onClick={() => setFocusedPromoId(promo.id)}
                      className={cn(
                        "group p-6 flex flex-col md:flex-row items-start md:items-center justify-between transition-all cursor-pointer",
                        focusedPromoId === promo.id
                          ? "bg-blue-50/80"
                          : "hover:bg-slate-50/80",
                      )}
                    >
                      <div className="flex items-center gap-4 w-full">
                        <div
                          className={cn(
                            "w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 transition-transform",
                            focusedPromoId === promo.id
                              ? "bg-blue-600 border-blue-600 text-white scale-105 shadow-lg"
                              : "bg-white border-slate-200 text-blue-600 shadow-sm",
                          )}
                        >
                          <Tag className="w-5 h-5" />
                        </div>
                        <div className="flex-1 truncate">
                          <div className="text-sm font-black italic tracking-tight text-slate-900 truncate">
                            {promo.title}
                          </div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            {promo.id.substring(0, 8)} • {promo.status}
                          </div>
                        </div>
                        {focusedPromoId === promo.id && (
                          <ChevronRight className="w-4 h-4 text-blue-600 animate-pulse shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Right Column: Governance Engine & Execution Context */}
            <div className="lg:col-span-8 flex flex-col gap-8 h-full">
              {focusedPromo ? (
                <>
                  <div className="flex items-center justify-between bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                    <div>
                      <h2 className="text-2xl font-black italic tracking-tighter text-slate-900">
                        {focusedPromo.title}
                      </h2>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1 flex gap-3">
                        <span>Target: {focusedPromo.target || "GENERAL"}</span>
                        <span
                          className={
                            focusedPromo.status === "active"
                              ? "text-emerald-500"
                              : "text-amber-500"
                          }
                        >
                          Status: {focusedPromo.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-black italic tracking-tighter text-slate-900">
                        {focusedPromo.type === "percentage"
                          ? `${focusedPromo.value}%`
                          : `Rp ${focusedPromo.value.toLocaleString()}`}
                      </span>
                      <div className="text-[10px] uppercase font-bold text-slate-400 mt-1">
                        Markdown Value
                      </div>
                    </div>
                  </div>

                  {/* The new Governance Layer Components */}
                  <ApprovalMatrix
                    governanceState={govState}
                    onSign={(dept, isBypass) =>
                      addSignature(dept, session.userId || "User", isBypass)
                    }
                    onToggleBypass={toggleBypassMode}
                    onBypassReasonChange={setBypassReason}
                  />

                  {/* Grid for Impact Sensors */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <BufferCollisionSensor
                      currentStock={1250} // Mocked context
                      promoImpactEstimate={450} // Mocked context
                      ecommerceBufferConfig={100} // Mocked context
                    />

                    <Card className="rounded-[2.5rem] bg-indigo-600 text-white p-8 group overflow-hidden relative border-none">
                      <Target className="absolute -right-8 -bottom-8 w-40 h-40 opacity-10 group-hover:scale-110 transition-transform" />
                      <div className="relative flex flex-col h-full justify-between">
                        <div className="space-y-4">
                          <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5" />
                          </div>
                          <h4 className="text-xl font-black italic tracking-tighter uppercase">
                            Elasticity Sensor
                          </h4>
                          <p className="text-xs font-medium opacity-80 leading-relaxed italic pr-4">
                            Pricing velocity models predict a 14% uplift in
                            sales volume for this markdown, with a tolerable
                            margin sacrifice.
                          </p>
                        </div>
                        <div className="mt-6 flex gap-2">
                          <Badge className="bg-indigo-500/50 hover:bg-indigo-500/50 border-none font-black text-[9px] uppercase">
                            Low Risk
                          </Badge>
                          <Badge className="bg-indigo-500/50 hover:bg-indigo-500/50 border-none font-black text-[9px] uppercase">
                            High Volume
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Execution Action Bar */}
                  <div className="mt-4 flex items-center justify-end bg-slate-900 p-6 rounded-[2.5rem] shadow-2xl sticky bottom-4 z-40 relative overflow-hidden group">
                    {/* Glow effect on hover */}
                    <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-6 relative z-10 w-full justify-between md:justify-end">
                      <span className="text-[10px] font-black italic uppercase tracking-widest text-slate-400 hidden md:block">
                        Action Requires Ledger Update
                      </span>
                      <Button
                        onClick={handleExecute}
                        disabled={
                          (!govState.quorumReached && !govState.isBypassMode) ||
                          govState.phase === "Executed" ||
                          focusedPromo.status === "active"
                        }
                        className={cn(
                          "h-14 px-8 rounded-2xl font-black italic text-xs uppercase tracking-widest gap-3 w-full md:w-auto shadow-lg transition-all",
                          govState.phase === "Executed" ||
                            focusedPromo.status === "active"
                            ? "bg-slate-800 text-slate-500"
                            : govState.isBypassMode
                              ? "bg-red-600 hover:bg-red-700 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                              : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]",
                        )}
                      >
                        {focusedPromo.status === "active" ||
                        govState.phase === "Executed" ? (
                          <>EXECUTED AND LOCKED</>
                        ) : (
                          <>
                            <Play className="w-4 h-4 ml-1" /> Commit to Edge &
                            Execute
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white/50">
                  <div className="text-center text-slate-400 space-y-3">
                    <Target className="w-12 h-12 mx-auto opacity-20" />
                    <div className="font-black italic uppercase tracking-widest text-xs">
                      Awaiting Focus
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AuditTrailModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        auditLog={auditLog}
        promoTitle={focusedPromo?.title || "Unknown Campaign"}
      />
    </div>
  );
};

export default PricingPromoDesk;
