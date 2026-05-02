import React, { useRef, useMemo } from "react";
import { ClipboardCheck, Edit3, ScanLine, Upload, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { OpnameSessionHeader } from "./opname/OpnameSessionHeader";
import { OpnameFilters } from "./opname/OpnameFilters";
import { OpnameTable, type OpnameEntry } from "./opname/OpnameTable";
import { InventoryFilters } from "./types";

type Props = {
  storeName?: string;
  opnameActive: boolean;
  opnameEntries: OpnameEntry[];
  filters: InventoryFilters;
  categoryOptions: { id: string; name: string }[];
  onFiltersChange: (patch: Partial<InventoryFilters>) => void;
  barcodeInput: string;
  onStart: () => void;
  onDiscard: () => void;
  onSubmit: () => void;
  onBarcodeChange: (val: string) => void;
  onBarcodeKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onCountChange: (index: number, value: string) => void;
  isLoading?: boolean;
  statusBadge: (status: string) => string;
};

export const StockOpnameTab: React.FC<Props> = ({
  storeName,
  opnameActive,
  opnameEntries,
  filters,
  categoryOptions,
  onFiltersChange,
  barcodeInput,
  onStart,
  onDiscard,
  onSubmit,
  onBarcodeChange,
  onBarcodeKeyDown,
  onCountChange,
  isLoading = false,
  statusBadge,
}) => {
  const barcodeRef = useRef<HTMLInputElement>(null);

  // Hook into the global scanner
  useBarcodeScanner((barcode) => {
    if (opnameActive) {
      onBarcodeChange(barcode);
      // Simulate enter key to trigger the register logic in parent
      onBarcodeKeyDown({
        key: "Enter",
      } as React.KeyboardEvent<HTMLInputElement>);
    }
  });

  // Local filtering for the view
  const filteredEntries = useMemo(() => {
    return (Array.isArray(opnameEntries) ? opnameEntries : []).filter((entry) => {
      const matchesSearch =
        !filters.search ||
        entry.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        entry.sku.toLowerCase().includes(filters.search.toLowerCase());

      const matchesCategory =
        filters.category === "all" || entry.categoryId === filters.category;

      const matchesStatus =
        filters.status === "all" ||
        entry.status?.toLowerCase() === filters.status.toLowerCase();

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [opnameEntries, filters]);

  if (!opnameActive) {
    return (
      <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
        <CardContent className="p-12 text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-blue-50 flex items-center justify-center mx-auto">
            <ClipboardCheck className="w-10 h-10 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-black italic tracking-tighter uppercase">
              Stock Opname
            </h2>
            <p className="text-sm text-slate-500 font-bold italic mt-2">
              Physical count & reconciliation for{" "}
              <span className="text-slate-800">{storeName}</span>
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-left max-w-lg mx-auto">
            {[
              {
                icon: Edit3,
                label: "Manual Input",
                desc: "Enter counts per row",
              },
              {
                icon: ScanLine,
                label: "Barcode Scan",
                desc: "Scan to increment",
              },
              {
                icon: Upload,
                label: "CSV Import",
                desc: "Upload count sheet",
              },
            ].map((m, i) => (
              <div
                key={i}
                className="bg-slate-50 rounded-2xl p-5 text-center space-y-2"
              >
                <m.icon className="w-5 h-5 text-blue-600 mx-auto" />
                <div className="text-xs font-black italic uppercase">
                  {m.label}
                </div>
                <div className="text-[10px] text-slate-400 font-bold">
                  {m.desc}
                </div>
              </div>
            ))}
          </div>
          <Button
            onClick={onStart}
            className="h-14 px-12 rounded-2xl bg-slate-900 text-white font-black italic uppercase tracking-widest text-xs gap-2 shadow-xl"
          >
            <Zap className="w-5 h-5" /> Start Opname Session
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <OpnameSessionHeader
        storeName={storeName}
        onDiscard={onDiscard}
        onSubmit={onSubmit}
      />

      <OpnameFilters
        filters={filters}
        categoryOptions={categoryOptions}
        onFiltersChange={onFiltersChange}
        barcodeInput={barcodeInput}
        onBarcodeChange={onBarcodeChange}
        onBarcodeKeyDown={onBarcodeKeyDown}
        barcodeRef={barcodeRef}
      />

      <OpnameTable
        entries={filteredEntries}
        isLoading={isLoading}
        onCountChange={(filteredIdx, val) => {
          // Map filtered index back to original index
          const originalEntry = filteredEntries[filteredIdx];
          const originalIdx = opnameEntries.findIndex(
            (e) => e.sku === originalEntry.sku,
          );
          if (originalIdx !== -1) {
            onCountChange(originalIdx, val);
          }
        }}
        statusBadge={statusBadge}
      />
    </div>
  );
};
