import { useCallback, useEffect, useMemo, useState } from "react";
import { 
  FileText, 
  ShieldCheck, 
  Gavel, 
  Calendar, 
  Search, 
  Download, 
  Scale, 
  History, 
  AlertTriangle,
  ClipboardCheck,
  Building,
  Globe,
  HelpCircle,
  Sticker,
  CheckCircle2,
  Clock,
  ArrowRight
} from "lucide-react";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/core/security/session";
import { formatCurrency } from "@/lib/utils/currency";

export default function TaxCompliance() {
  const session = useSession();
  const [activeTab, setActiveTab] = useState("calendar");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tax & Compliance Center"
        subtitle="Manage mult-jurisdictional tax obligations, VAT returns, and audit readiness across all business units."
        primaryAction={
          <Button disabled title="Not available yet" className="gap-2 bg-slate-900 border-none hover:bg-slate-800 text-white">
            <Download className="w-4 h-4" /> Download Certificate
          </Button>
        }
        secondaryActions={
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <Button disabled title="Not available yet" variant="ghost" size="sm" className="bg-white shadow-sm font-bold text-[10px] uppercase tracking-wider">Domestic</Button>
            <Button disabled title="Not available yet" variant="ghost" size="sm" className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">International</Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-4">
        <ComplianceSummaryCard 
          label="VAT Liability (IDR)" 
          value={125400000} 
          status="PENDING" 
          dueDate="May 20, 2026" 
          icon={Sticker}
        />
        <ComplianceSummaryCard 
          label="Corporate Income Tax" 
          value={450000000} 
          status="ESTIMATED" 
          dueDate="Jul 15, 2026" 
          icon={Building}
        />
        <ComplianceSummaryCard 
          label="Withholding Tax" 
          value={12800000} 
          status="AUTO_SYNCED" 
          dueDate="Monthly" 
          icon={ClipboardCheck}
        />
        <ComplianceSummaryCard 
          label="Compliance Score" 
          value="98.4%" 
          status="EXCELLENT" 
          trend="+2.1%" 
          icon={ShieldCheck}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <WorkspacePanel 
            title="Tax Reporting Calendar" 
            description="Timeline of upcoming statutory filings and payments."
          >
            <div className="space-y-4 pt-2">
              <CalendarEventRow 
                date="May 20" 
                title="VAT (PPN) Return - Period April 2026" 
                detail="Finalization of input/output tax netting." 
                status="UPCOMING" 
              />
              <CalendarEventRow 
                date="Jun 10" 
                title="Withholding Tax (PPh 21/23/26)" 
                detail="Employee and vendor withholding report." 
                status="AUTOMATED" 
              />
              <CalendarEventRow 
                date="Jun 15" 
                title="PPh 25 Monthly Installment" 
                detail="Estimated corporate tax payment." 
                status="PENDING" 
              />
            </div>
          </WorkspacePanel>

          <WorkspacePanel title="Audit Readiness Evidence" description="Archive of documents verified for institutional review.">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="vault">Evidence Vault</TabsTrigger>
                <TabsTrigger value="certificates">Certificates</TabsTrigger>
                <TabsTrigger value="history">Filing History</TabsTrigger>
              </TabsList>
              
              <TabsContent value="vault" className="grid gap-4 sm:grid-cols-2 mt-4">
                <EvidenceCard title="Purchase Invoices (Verified)" count={1240} size="450MB" date="Updated 2h ago" />
                <EvidenceCard title="Sales Records (GDS Sync)" count={8500} size="1.2GB" date="Updated 4h ago" />
                <EvidenceCard title="Bank Statement Reconciles" count={12} size="15MB" date="Updated 1d ago" />
                <EvidenceCard title="Payroll Tax Journals" count={4} size="8MB" date="Updated 1w ago" />
              </TabsContent>
            </Tabs>
          </WorkspacePanel>
        </div>

        <div className="space-y-6">
          <WorkspacePanel title="Risk Monitoring" description="AI-driven compliance anomaly detection.">
            <div className="space-y-4">
              <div className="flex gap-4 p-4 rounded-2xl bg-amber-50 border border-amber-100">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-900">VAT Discrepancy</p>
                  <p className="text-xs text-amber-700 font-bold leading-relaxed mt-1">
                    Detected Rp 1.5Mn gap in vendor output tax verification for SUMMIT LTD.
                  </p>
                  <Button disabled title="Not available yet" variant="link" className="p-0 h-auto text-[10px] font-black uppercase text-amber-800 mt-2">Check Invoice</Button>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-4 h-4 text-indigo-400" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Regulatory Update</p>
                </div>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                  The <span className="text-white font-bold italic">Law No. 7/2021 Update</span> regarding carbon tax targets will affect Logistics OpEx starting July.
                </p>
                <Button disabled title="Not available yet" className="w-full h-8 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-[0.2em] text-[8px] mt-4">
                  Analyze Exposure
                </Button>
              </div>
            </div>
          </WorkspacePanel>

          <WorkspacePanel title="Help Center" description="Direct line to compliance specialists.">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl border hover:bg-slate-50 cursor-pointer transition-colors group">
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                  <p className="text-xs font-bold text-slate-600 group-hover:text-slate-900">VAT Filing Guide</p>
                </div>
                <ArrowRight className="w-3 h-3 text-slate-300" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl border hover:bg-slate-50 cursor-pointer transition-colors group">
                <div className="flex items-center gap-3">
                  <Gavel className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                  <p className="text-xs font-bold text-slate-600 group-hover:text-slate-900">Regulation Database</p>
                </div>
                <ArrowRight className="w-3 h-3 text-slate-300" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl border hover:bg-slate-50 cursor-pointer transition-colors group">
                <div className="flex items-center gap-3">
                  <Scale className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                  <p className="text-xs font-bold text-slate-600 group-hover:text-slate-900">Legal Opinions</p>
                </div>
                <ArrowRight className="w-3 h-3 text-slate-300" />
              </div>
            </div>
          </WorkspacePanel>
        </div>
      </div>
    </div>
  );
}

function ComplianceSummaryCard({ label, value, status, dueDate, trend, icon: Icon }: any) {
  return (
    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 h-fit">
          <Icon className="w-5 h-5 text-slate-400" />
        </div>
        <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-indigo-200 text-indigo-700 bg-indigo-50">
          {status}
        </Badge>
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className="text-xl font-black text-slate-900 tracking-tight">
        {typeof value === "number" ? formatCurrency(value) : value}
      </p>
      {dueDate && (
        <div className="flex items-center gap-1.5 mt-3">
          <Clock className="w-3 h-3 text-slate-300" />
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{dueDate}</p>
        </div>
      )}
      {trend && (
        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-2">{trend} Improvement</p>
      )}
    </div>
  );
}

function CalendarEventRow({ date, title, detail, status }: any) {
  return (
    <div className="flex gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors group border-b last:border-0 border-slate-100">
      <div className="flex flex-col items-center justify-center h-12 w-12 bg-white rounded-xl border border-slate-100 shadow-sm group-hover:border-indigo-200 transition-colors shrink-0">
        <p className="text-[10px] font-black uppercase tracking-tighter text-slate-400">{date.split(" ")[0]}</p>
        <p className="text-sm font-black text-slate-900">{date.split(" ")[1]}</p>
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <p className="text-xs font-black text-slate-900 uppercase tracking-tight italic">{title}</p>
          <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest px-2 h-5">
            {status}
          </Badge>
        </div>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{detail}</p>
      </div>
    </div>
  );
}

function EvidenceCard({ title, count, size, date }: any) {
  return (
    <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/30 hover:bg-white hover:shadow-lg hover:border-indigo-100 transition-all group">
      <div className="flex items-center justify-between mb-3">
        <FileText className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
        <Button disabled title="Not available yet" variant="ghost" size="icon" className="h-6 w-6 rounded-lg">
          <Download className="w-3 h-3" />
        </Button>
      </div>
      <p className="text-xs font-black text-slate-900 uppercase tracking-tight mb-1">{title}</p>
      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        <p>{count} Files</p>
        <p>{size}</p>
      </div>
      <p className="text-[9px] text-slate-300 mt-2 italic">{date}</p>
    </div>
  );
}
