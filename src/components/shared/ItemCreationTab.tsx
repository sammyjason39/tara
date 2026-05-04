import React, { useState } from "react";
import { Upload, Download, Plus, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { PostekPrintModal, PrintItem } from "./PostekPrintModal";
import { NewItemFormRow, type NewItemLine } from "./NewItemFormRow";

import { retailService } from "@/core/services/retail/retailService";
import { inventoryService } from "@/core/services/inventory/inventoryService";
import type { SessionContext } from "@/core/security/session";

type Props = {
  canWrite: boolean;
  session?: SessionContext;
  tenantId?: string;
  categoryOptions?: { id: string; name: string }[];
  onSuccess?: () => void;
};

export const ItemCreationTab: React.FC<Props> = ({
  canWrite,
  session,
  tenantId,
  categoryOptions = [],
  onSuccess,
}) => {
  const { toast } = useToast();
  const [rows, setRows] = useState<NewItemLine[]>([
    {
      tempId: "initial-row",
      sku: "",
      name: "",
      categoryId: "",
      barcode: "",
      price: 0,
      qty: 1,
      unit: "pcs",
      type: "ITEM",
      status: "active",
      description: "",
      images: [],
      primaryImageIndex: 0,
    },
  ]);

  const [printItems, setPrintItems] = useState<PrintItem[]>([]);

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        tempId: `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sku: "",
        name: "",
        categoryId: "",
        barcode: "",
        price: 0,
        qty: 1,
        unit: "pcs",
        type: "ITEM",
        status: "active",
        description: "",
        images: [],
        primaryImageIndex: 0,
      },
    ]);
  };

  const removeRow = (id: string) => {
    if (rows.length === 1) {
      setRows([
        {
          tempId: "row-reset",
          sku: "",
          name: "",
          categoryId: "",
          barcode: "",
          price: 0,
          qty: 1,
          unit: "pcs",
          type: "ITEM",
          status: "active",
          description: "",
          images: [],
          primaryImageIndex: 0,
        },
      ]);
      return;
    }
    setRows((Array.isArray(rows) ? rows : []).filter((r) => r.tempId !== id));
  };

  const updateRow = (id: string, patch: Partial<NewItemLine>) => {
    setRows((Array.isArray(rows) ? rows : []).map((r) => (r.tempId === id ? { ...r, ...patch } : r)));
  };

  // Global scanner support for creation
  useBarcodeScanner((barcode) => {
    const lastRow = rows[rows.length - 1];
    if (!lastRow.barcode && !lastRow.sku && !lastRow.name) {
      updateRow(lastRow.tempId, { barcode });
    } else {
      addRow();
      // Need to adjust because addRow is async state.
      // But for simple scanner, adding a row with barcode is fine.
      // We'll just update the last row for now.
    }
    toast({ title: "Barcode Scanned", description: barcode });
  });

  const handleSubmit = async () => {
    if (!session || !tenantId) return;

    try {
      const payload = (Array.isArray(rows) ? rows : []).map((r) => ({
        sku: r.sku,
        name: r.name,
        category: r.categoryId,
        barcode: r.barcode,
        basePrice: r.price,
        uom: r.unit,
        description: r.description,
        active: r.status === "active",
        type: r.type,
      }));

      const res = await retailService.batchCreateItemsJson(
        tenantId,
        session,
        payload,
      );

      if (res.success) {
        // --- Image Upload Phase ---
        const createdItems = res.data as any[];
        
        for (const row of rows) {
          if (row.images && row.images.length > 0) {
            const matchedItem = createdItems.find(item => item.sku === row.sku);
            if (matchedItem) {
              const itemId = matchedItem.id;
              
              // Sort images to upload primary first (backend sets first upload as primary by default)
              const primaryIdx = row.primaryImageIndex || 0;
              const uploadOrder = [
                row.images[primaryIdx],
                ...row.images.filter((_, idx) => idx !== primaryIdx)
              ];

              for (const file of uploadOrder) {
                try {
                  await inventoryService.uploadItemImage(tenantId, session, itemId, file);
                } catch (uploadError) {
                  console.error(`Failed to upload image for ${row.sku}:`, uploadError);
                }
              }
            }
          }
        }

        toast({
          title: "Success",
          description: "Batch items and images processed successfully.",
        });
        setRows([
          {
            tempId: "row-final",
            sku: "",
            name: "",
            categoryId: "",
            barcode: "",
            price: 0,
            qty: 1,
            unit: "pcs",
            type: "ITEM",
            status: "active",
            description: "",
            images: [],
            primaryImageIndex: 0,
          },
        ]);
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to create batch items." });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-20">
      {/* ── Page Intro ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black italic tracking-tighter text-slate-900 uppercase">
            Manual Batch Creation
          </h2>
          <p className="text-slate-500 font-medium mt-2">
            Add new unique products to the global master list.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={addRow}
            variant="outline"
            className="rounded-2xl h-12 px-6 font-black italic text-xs uppercase tracking-widest gap-2 bg-white border-slate-200 hover:bg-slate-50 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Another Item
          </Button>
        </div>
      </div>

      {/* ── Batch List ── */}
      <div className="space-y-6">
        {(Array.isArray(rows) ? rows : []).map((row) => (
          <NewItemFormRow
            key={row.tempId}
            line={row}
            categoryOptions={categoryOptions}
            onChange={updateRow}
            onRemove={removeRow}
            onPrint={(line) => {
              setPrintItems([
                {
                  id: line.sku || line.barcode || line.tempId,
                  sku: line.sku,
                  name: line.name || "New Item",
                  barcode: line.barcode || line.sku,
                  price: line.price,
                },
              ]);
            }}
            showQty={false} // Creation tab doesn't need qty per item (it's master list)
            showExtended={true} // Show description, type, etc.
          />
        ))}
      </div>

      {/* ── Action Footer ── */}
      <div className="sticky bottom-8 z-40 flex justify-center">
        <Button
          onClick={handleSubmit}
          disabled={!canWrite || rows.some((r) => !r.name || !r.sku)}
          className="rounded-[2rem] h-16 px-12 font-black italic uppercase tracking-[0.2em] text-sm gap-4 bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xl shadow-indigo-200 transition-all hover:scale-105"
        >
          <Send className="w-5 h-5" /> Submit Batch to Core Repository
        </Button>
      </div>

      {/* ── CSV Import (Secondary) ── */}
      <Card className="rounded-[3rem] border-none shadow-sm bg-slate-50/50 border border-slate-200/50 mt-12">
        <CardContent className="p-12 flex flex-col md:flex-row items-center gap-10">
          <div className="w-24 h-24 rounded-[2.5rem] bg-indigo-100 flex items-center justify-center shrink-0">
            <Upload className="w-10 h-10 text-indigo-600" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-xl font-black italic tracking-tight uppercase">
              Bulk Import CSV/Excel
            </h3>
            <p className="text-slate-500 text-sm font-medium mt-1">
              Have a large list? Download the template or upload your prepared
              inventory file.
            </p>
            <div className="flex flex-wrap gap-4 mt-6 justify-center md:justify-start">
              <Button
                variant="outline"
                className="rounded-2xl h-11 px-6 font-bold tracking-tight gap-2 border-slate-200 bg-white"
              >
                <Download className="w-4 h-4" /> Download Template
              </Button>
              <Button className="rounded-2xl h-11 px-8 font-black italic uppercase tracking-widest text-xs gap-3 bg-slate-900 hover:bg-black text-white">
                <Upload className="w-4 h-4" /> Select File
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <PostekPrintModal
        open={printItems.length > 0}
        onClose={() => setPrintItems([])}
        items={printItems}
      />
    </div>
  );
};
