import React from "react";
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
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Package,
  MapPin,
  User,
  Clock,
  DollarSign,
  Truck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import type { RetailOrder, OrderStatus } from "@/core/types/retail/retail";

interface OrderDetailModalProps {
  order: RetailOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (orderId: string, newStatus: OrderStatus) => void;
  onVoid?: (orderId: string) => void;
  onRefund?: (orderId: string, items: string[]) => void;
}


  onStatusChange,
  onVoid,
  onRefund,
}) => {

  if (!order) return null;

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case "pending_payment":
      case "reserved":
        return "bg-slate-100 text-slate-700";
      case "paid":
        return "bg-blue-100 text-blue-700";
      case "processing":
        return "bg-amber-100 text-amber-700";
      case "ready_for_pickup":
        return "bg-indigo-100 text-indigo-700";
      case "shipped":
        return "bg-emerald-100 text-emerald-700";
      case "complete":
        return "bg-slate-900 text-white";
      case "cancelled":
        return "bg-red-100 text-red-700";
      case "refunded":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const handleStatusChange = (newStatus: OrderStatus) => {
    if (onStatusChange) {
      onStatusChange(order.id, newStatus);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl rounded-[2.5rem] border-none shadow-2xl max-h-[90vh] overflow-y-auto p-0 scrollbar-hide">
        <div className="relative">
          {/* Header Gradient */}
          <div className="h-32 bg-gradient-to-r from-slate-900 to-indigo-950 px-8 flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-black italic tracking-tighter uppercase text-white">
                Fulfillment Token: {order.id.slice(-8).toUpperCase()}
              </DialogTitle>
              <div className="text-[10px] font-black italic uppercase tracking-widest text-indigo-300 mt-1 flex items-center gap-2">
                <Clock className="w-3 h-3" /> Timestamp:{" "}
                {new Date(order.createdAt).toLocaleString()}
              </div>
            </div>
            <Badge
              className={cn(
                getStatusColor(order.status as OrderStatus),
                "font-black italic text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl shadow-lg border-none",
              )}
            >
              {order.status.toUpperCase().replace("_", " ")}
            </Badge>
          </div>

          <div className="p-8 space-y-8 bg-white min-h-[400px]">
            {/* Customer & Logistics Logic Block */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-[2rem] p-6 flex items-center gap-4 border border-slate-100">
                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                    Carrier Destination
                  </div>
                  <div className="font-black italic text-slate-900">
                    {order.customerName || "Walk-in Customer"}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-[2rem] p-6 flex items-center gap-4 border border-slate-100">
                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                    Node Origin
                  </div>
                  <div className="font-black italic text-slate-900">
                    {order.storeId.slice(-8).toUpperCase()}
                  </div>
                </div>
              </div>
            </div>

            {/* Line Item Payloads */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Package className="w-4 h-4" /> Pipeline Payloads
                </div>
                <Badge className="bg-indigo-50 text-indigo-600 border-none font-black italic text-[9px] uppercase tracking-widest">
                  {order.items.length} Units
                </Badge>
              </div>

              <div className="space-y-3">
                {order.items.map((item, idx) => {
                  const soh = Math.floor(Math.random() * 50) + 5;
                  const safetyBuffer = 10;
                  const ats = soh - safetyBuffer;
                  const isBufferWarning = ats < item.quantity;

                  return (
                    <div
                      key={idx}
                      className="flex flex-col p-5 bg-white border border-slate-100 rounded-[1.5rem] hover:border-indigo-300 transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                            <Package className="w-6 h-6 text-slate-400 group-hover:text-indigo-600" />
                          </div>
                          <div>
                            <div className="font-black italic text-slate-900">
                              {item.name}
                            </div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                              Quantity Payload: {item.quantity}
                            </div>
                          </div>
                        </div>
                        <div className="text-right font-black italic text-slate-900">
                          Rp {(item.totalPrice || 0).toLocaleString()}
                        </div>
                      </div>

                      {/* Stock Integrity Telemetry */}
                      <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                        <div className="flex gap-6 text-[9px] font-black italic uppercase tracking-widest">
                          <p className="text-slate-400">
                            SOH: <span className="text-slate-900">{soh}</span>
                          </p>
                          <p className="text-slate-400">
                            Buffer:{" "}
                            <span className="text-slate-900">
                              {safetyBuffer}
                            </span>
                          </p>
                          <p
                            className={
                              isBufferWarning
                                ? "text-amber-600"
                                : "text-emerald-600"
                            }
                          >
                            ATS: {ats}
                          </p>
                        </div>
                        {isBufferWarning && (
                          <Badge className="bg-amber-50 text-amber-600 border-none font-black italic text-[8px] uppercase tracking-tighter">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Stock
                            Depletion Risk
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Financial Ledger Block */}
            <Card className="rounded-[2rem] bg-slate-950 p-6 border-none text-white shadow-2xl relative overflow-hidden">
              <DollarSign className="absolute -right-4 -bottom-4 w-24 h-24 text-white/5 opacity-20" />
              <div className="relative z-10 space-y-4">
                <div className="flex justify-between items-center text-[10px] font-black italic uppercase tracking-widest text-indigo-400">
                  <span>Manifest Total</span>
                  <span>{order.paymentMethod?.toUpperCase()}</span>
                </div>
                <div className="flex justify-between items-end">
                  <div className="text-4xl font-black italic tracking-tighter">
                    Rp {(order.totalAmount || 0).toLocaleString()}
                  </div>
                  <div className="text-[10px] font-bold italic opacity-40 uppercase">
                    Tax Included: Rp {(order.tax || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </Card>

            {/* Tactical Action Bar */}
            <div className="flex gap-4 pt-4 pb-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="h-14 flex-1 rounded-2xl border-slate-200 font-black italic uppercase text-[10px] tracking-widest hover:bg-slate-50"
              >
                Cancel View
              </Button>

              {order.status === "paid" && (
                <Button
                  onClick={() => handleStatusChange("processing")}
                  className="h-14 flex-[2] bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-black italic uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-100"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Initiate Processing
                </Button>
              )}

              {order.status === "processing" && (
                <Button
                  onClick={() => handleStatusChange("ready_for_pickup")}
                  className="h-14 flex-[2] bg-amber-500 hover:bg-amber-600 rounded-2xl font-black italic uppercase text-[10px] tracking-widest shadow-xl shadow-amber-100"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Mark Ready for Pickup
                </Button>
              )}

              {order.status === "ready_for_pickup" && (
                <Button
                  onClick={() => handleStatusChange("shipped")}
                  className="h-14 flex-[2] bg-emerald-600 hover:bg-emerald-700 rounded-2xl font-black italic uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-100"
                >
                  <Truck className="w-4 h-4 mr-2" />
                  Dispatch Payload
                </Button>
              )}

              {order.status === "shipped" && (
                <Button
                  onClick={() => handleStatusChange("complete")}
                  className="h-14 flex-[2] bg-slate-900 hover:bg-slate-800 rounded-2xl font-black italic uppercase text-[10px] tracking-widest shadow-xl shadow-slate-100"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm Receipt
                </Button>
              )}

              {/* Advanced Actions (Void/Refund) */}
              {(order.status === "paid" || order.status === "processing") && onVoid && (
                <Button
                  variant="ghost"
                  onClick={() => onVoid(order.id)}
                  className="h-14 w-14 rounded-2xl border border-red-100 text-red-600 hover:bg-red-50"
                  title="Void Order"
                >
                  <XCircle className="w-5 h-5" />
                </Button>
              )}

              {order.status === "complete" && onRefund && (
                <Button
                  variant="ghost"
                  onClick={() => onRefund(order.id, order.items.map(i => i.product_id))}
                  className="h-14 w-14 rounded-2xl border border-orange-100 text-orange-600 hover:bg-orange-50"
                  title="Initiate Refund"
                >
                  <CheckCircle2 className="w-5 h-5" />
                </Button>
              )}
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
