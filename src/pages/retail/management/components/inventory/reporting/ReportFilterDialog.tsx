import React from "react";
import {
  Download,
  FileText,
  History,
  Building2,
  Calendar,
  Layers,
  Info,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ReportTemplate } from "./ReportingHubTypes";
import type { RetailStore } from "@/core/types/retail/retail";

interface ReportFilterDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  activeReportMeta: ReportTemplate | null;
  branchId: string;
  setBranchId: (id: string) => void;
  isAdmin: boolean;
  stores: RetailStore[];
  effectiveBranchId: string;
  dateFrom: string;
  setDateFrom: (val: string) => void;
  dateTo: string;
  setDateTo: (val: string) => void;
  toggles: {
    costPrice: boolean;
    supplierInfo: boolean;
    barcodes: boolean;
  };
  toggleField: (field: "costPrice" | "supplierInfo" | "barcodes") => void;
  isGenerating: boolean;
  handleExport: (format: "CSV" | "PDF" | "EXCEL") => void;
}

export const ReportFilterDialog: React.FC<ReportFilterDialogProps> = ({
  isOpen,
  onOpenChange,
  activeReportMeta,
  branchId,
  setBranchId,
  isAdmin,
  stores,
  effectiveBranchId,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  toggles,
  toggleField,
  isGenerating,
  handleExport,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1000px] p-0 border-none rounded-[2rem] overflow-hidden bg-white/95 backdrop-blur-2xl shadow-[0_64px_128px_-24px_rgba(0,0,0,0.15)] ring-1 ring-black/5">
        <div className="flex flex-col lg:flex-row h-full lg:min-h-[600px]">
          {/* Modal Left: Active Report Info */}
          <div className="hidden lg:flex lg:w-80 bg-background p-6 flex-col justify-between relative overflow-hidden">
            <div className="absolute -left-16 -top-16 w-64 h-64 bg-primary/20 rounded-full blur-[100px]" />
            <div className="relative z-10 space-y-8">
              <div className="w-16 h-16 rounded-[2rem] bg-white/10 border border-border flex items-center justify-center">
                {activeReportMeta && (
                  <activeReportMeta.icon className="w-8 h-8 text-foreground" />
                )}
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-black italic text-foreground uppercase tracking-tighter leading-none">
                  {activeReportMeta?.label}
                </h3>
                <div className="h-1 w-12 bg-primary rounded-full" />
                <p className="text-sm text-muted-foreground font-medium italic leading-relaxed">
                  {activeReportMeta?.description}
                </p>
              </div>
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 text-primary mb-6">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  Secure Endpoint
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-secondary/40 border border-white/5">
                <p className="text-[10px] font-bold text-muted-foreground italic uppercase">
                  Trace ID: EXT-
                  {Math.random().toString(36).substring(7).toUpperCase()}
                </p>
              </div>
            </div>
          </div>

          {/* Modal Right: Filter Logic */}
          <div className="flex-1 p-6 lg:p-8 space-y-10 overflow-y-auto">
            <div>
              <DialogHeader className="p-0 text-left">
                <DialogTitle className="font-black italic text-3xl tracking-tighter text-primary-foreground uppercase mb-2">
                  Extraction Parameters
                </DialogTitle>
                <DialogDescription className="text-muted-foreground font-medium italic">
                  Configure your data scope and formatting options to initiate
                  the deployment.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Branch Selection */}
              <div className="space-y-5">
                <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-primary" /> Store
                  Isolation
                </Label>
                <Select
                  value={effectiveBranchId}
                  onValueChange={setBranchId}
                  disabled={!isAdmin}
                >
                  <SelectTrigger className="h-16 rounded-xl font-black italic border-border bg-white shadow-sm px-6 hover:bg-secondary/5 transition-all">
                    <SelectValue placeholder="Select Location" />
                  </SelectTrigger>
                  <SelectContent className="rounded-[2rem] border-none shadow-2xl p-3 font-black italic bg-white/95 backdrop-blur-md">
                    <SelectItem
                      value="all"
                      className="rounded-xl py-4 focus:bg-primary/5"
                    >
                      Global HQ (All Branches)
                    </SelectItem>
                    <Separator className="my-3 opacity-50" />
                    {(Array.isArray(stores) ? stores : []).map((s) => (
                      <SelectItem
                        key={s.id}
                        value={s.id}
                        className="rounded-xl py-4 focus:bg-primary/5"
                      >
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Selection */}
              <div className="space-y-5">
                <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-primary" /> Time
                  Dimension
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="h-16 rounded-xl border-border bg-white shadow-sm px-6 font-bold focus:ring-indigo-500 transition-all text-sm"
                  />
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="h-16 rounded-xl border-border bg-white shadow-sm px-6 font-bold focus:ring-indigo-500 transition-all text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Data Toggles */}
            <div className="space-y-6">
              <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                Information Manifest (Toggle Columns)
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { key: "costPrice", label: "Cost", icon: Layers },
                  { key: "supplierInfo", label: "Vendor", icon: Info },
                  { key: "barcodes", label: "UPC", icon: History },
                ].map((toggle) => (
                  <div
                    key={toggle.key}
                    onClick={() =>
                      toggleField(toggle.key as keyof typeof toggles)
                    }
                    className={cn(
                      "flex flex-col items-center justify-center p-8 rounded-2xl cursor-pointer transition-all border-2 text-center space-y-4",
                      toggles[toggle.key as keyof typeof toggles]
                        ? "bg-primary/5 border-primary shadow-xl shadow-indigo-100/50"
                        : "bg-white border-border text-muted-foreground hover:border-border",
                    )}
                  >
                    <toggle.icon
                      className={cn(
                        "w-7 h-7",
                        toggles[toggle.key as keyof typeof toggles]
                          ? "text-primary"
                          : "text-muted-foreground/60",
                      )}
                    />
                    <div
                      className={cn(
                        "text-[10px] font-black italic uppercase tracking-widest",
                        toggles[toggle.key as keyof typeof toggles]
                          ? "text-primary"
                          : "text-muted-foreground",
                      )}
                    >
                      {toggle.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Export Actions */}
            <div className="pt-8 flex flex-col sm:flex-row gap-5">
              <Button
                onClick={() => handleExport("CSV")}
                disabled={isGenerating}
                className="flex-1 h-20 rounded-2xl bg-primary hover:bg-primary/90 text-foreground font-black italic uppercase tracking-[0.25em] text-sm gap-4 shadow-2xl shadow-indigo-200 transition-all active:scale-95"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    <Download className="w-6 h-6" /> Deploy Extract
                  </>
                )}
              </Button>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => handleExport("EXCEL")}
                  disabled={isGenerating}
                  className="w-20 h-20 rounded-2xl p-0 border-2 border-border hover:bg-secondary/5 hover:border-border transition-all"
                  title="Export .XLSX"
                >
                  <Layers className="w-6 h-6 text-foreground" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleExport("PDF")}
                  disabled={isGenerating}
                  className="w-20 h-20 rounded-2xl p-0 border-2 border-border hover:bg-secondary/5 hover:border-border transition-all"
                  title="Export .PDF"
                >
                  <FileText className="w-6 h-6 text-foreground" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
