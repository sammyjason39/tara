import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, TrendingUp, MapPin, Clock, Edit3, Trash2 } from "lucide-react";

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  stock: number;
}

interface ItemDetailModalProps {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (item: InventoryItem) => void;
  onDelete?: (sku: string) => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}) => {
  if (!item) return null;

  // Mock data for demonstration
  const movements = [
    { date: "2026-02-15 14:30", type: "SALE", qty: -5, location: "Store Jakarta", ref: "ORD-9921" },
    { date: "2026-02-15 10:15", type: "RECEIVE", qty: 50, location: "Warehouse", ref: "PO-8801" },
    { date: "2026-02-14 16:45", type: "TRANSFER", qty: -10, location: "Store Surabaya", ref: "TF-8802" },
    { date: "2026-02-14 09:20", type: "ADJUSTMENT", qty: 2, location: "Store Jakarta", ref: "ADJ-1234" },
  ];

  const locations = [
    { name: "Store Jakarta", stock: item.stock, status: "ACTIVE" },
    { name: "Store Surabaya", stock: Math.floor(item.stock * 0.6), status: "ACTIVE" },
    { name: "Warehouse Central", stock: Math.floor(item.stock * 2), status: "ACTIVE" },
  ];

  const getMovementColor = (type: string) => {
    switch (type) {
      case 'SALE': return 'text-red-600 bg-red-50';
      case 'RECEIVE': return 'text-emerald-600 bg-emerald-50';
      case 'TRANSFER': return 'text-blue-600 bg-blue-50';
      case 'ADJUSTMENT': return 'text-amber-600 bg-amber-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl rounded-[2rem] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-black italic tracking-tighter uppercase">
                {item.name}
              </DialogTitle>
              <DialogDescription className="font-bold italic mt-1">
                SKU: {item.sku} • Category: {item.category}
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              {onEdit && (
                <Button
                  onClick={() => onEdit(item)}
                  variant="outline"
                  size="sm"
                  className="h-10 px-4 rounded-xl font-black italic"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
              {onDelete && (
                <Button
                  onClick={() => {
                    if (confirm(`Remove ${item.name} from inventory?`)) {
                      onDelete(item.sku);
                      onClose();
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="h-10 px-4 rounded-xl font-black italic text-red-600 border-red-300 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-3 rounded-xl bg-slate-100 p-1">
            <TabsTrigger value="overview" className="rounded-lg font-black italic text-xs">Overview</TabsTrigger>
            <TabsTrigger value="movements" className="rounded-lg font-black italic text-xs">Movements</TabsTrigger>
            <TabsTrigger value="locations" className="rounded-lg font-black italic text-xs">Locations</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-2xl p-6 border-2 border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  <div className="text-xs font-black uppercase tracking-widest text-blue-600">Stock On Hand</div>
                </div>
                <div className="text-3xl font-black italic text-blue-900">{item.stock}</div>
                <div className="text-xs text-blue-600 font-bold mt-1">Units Available</div>
              </div>

              <div className="bg-emerald-50 rounded-2xl p-6 border-2 border-emerald-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  <div className="text-xs font-black uppercase tracking-widest text-emerald-600">Turnover</div>
                </div>
                <div className="text-3xl font-black italic text-emerald-900">8.2x</div>
                <div className="text-xs text-emerald-600 font-bold mt-1">Per Month</div>
              </div>

              <div className="bg-amber-50 rounded-2xl p-6 border-2 border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <div className="text-xs font-black uppercase tracking-widest text-amber-600">Reorder Point</div>
                </div>
                <div className="text-3xl font-black italic text-amber-900">15</div>
                <div className="text-xs text-amber-600 font-bold mt-1">Safety Stock</div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6">
              <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Item Details</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-400 font-bold">Item ID</div>
                  <div className="font-black italic">{item.id}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-bold">Category</div>
                  <div className="font-black italic">{item.category}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-bold">Status</div>
                  <Badge className="bg-emerald-100 text-emerald-700 font-black italic">ACTIVE</Badge>
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-bold">Last Updated</div>
                  <div className="font-black italic text-sm">{new Date().toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="movements" className="space-y-3 mt-4">
            <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Recent Activity</div>
            {movements.map((movement, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 transition-all">
                <div className="flex items-center gap-4">
                  <Badge className={`${getMovementColor(movement.type)} font-black italic text-xs px-3`}>
                    {movement.type}
                  </Badge>
                  <div>
                    <div className="font-black italic text-sm">{movement.ref}</div>
                    <div className="text-xs text-slate-400 font-bold">{movement.location}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-black italic ${movement.qty > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {movement.qty > 0 ? '+' : ''}{movement.qty}
                  </div>
                  <div className="text-xs text-slate-400 font-bold">{movement.date}</div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="locations" className="space-y-3 mt-4">
            <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Stock by Location</div>
            {locations.map((location, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="font-black italic">{location.name}</div>
                    <Badge className="bg-emerald-100 text-emerald-700 font-black italic text-xs mt-1">
                      {location.status}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black italic text-slate-900">{location.stock}</div>
                  <div className="text-xs text-slate-400 font-bold">Units</div>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
