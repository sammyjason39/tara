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
import { Package, MapPin, User, Clock, DollarSign, Truck, CheckCircle2, XCircle } from "lucide-react";
import type { RetailOrder, OrderStatus } from "@/core/types/retail/retail";

interface OrderDetailModalProps {
  order: RetailOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (orderId: string, newStatus: OrderStatus) => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  isOpen,
  onClose,
  onStatusChange,
}) => {
  if (!order) return null;

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending_payment': return 'bg-amber-100 text-amber-700';
      case 'paid': return 'bg-blue-100 text-blue-700';
      case 'fulfilled': return 'bg-emerald-100 text-emerald-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      case 'refunded': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
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
      <DialogContent className="max-w-3xl rounded-[2rem] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-black italic tracking-tighter uppercase">
                Order {order.id}
              </DialogTitle>
              <DialogDescription className="font-bold italic mt-1">
                Placed on {new Date(order.createdAt).toLocaleString()}
              </DialogDescription>
            </div>
            <Badge className={`${getStatusColor(order.status)} font-black italic text-sm px-4 py-2`}>
              {order.status.toUpperCase().replace('_', ' ')}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Customer Information */}
          <div className="bg-slate-50 rounded-2xl p-6 space-y-3">
            <div className="text-xs font-black uppercase tracking-widest text-slate-400">Order Details</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="text-xs text-slate-400 font-bold">Customer</div>
                  <div className="font-black italic">{order.customerName || 'Walk-in Customer'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-emerald-600" />
                <div>
                  <div className="text-xs text-slate-400 font-bold">Store</div>
                  <div className="font-black italic">{order.storeId}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-indigo-600" />
                <div>
                  <div className="text-xs text-slate-400 font-bold">Cashier</div>
                  <div className="font-black italic">{order.cashierId}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-amber-600" />
                <div>
                  <div className="text-xs text-slate-400 font-bold">Device</div>
                  <div className="font-black italic">{order.deviceId}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Order Items</div>
            <div className="space-y-2">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                      <Package className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <div className="font-black italic">{item.name}</div>
                      <div className="text-xs text-slate-400 font-bold">Qty: {item.quantity} • Item ID: {item.itemId}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black italic">Rp {item.totalPrice.toLocaleString()}</div>
                    <div className="text-xs text-slate-400 font-bold">@ Rp {item.unitPrice.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Order Summary */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
              <DollarSign className="w-4 h-4" />
              Order Summary
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-bold italic">Subtotal</span>
                <span className="font-black">Rp {order.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-bold italic">Tax</span>
                <span className="font-black">Rp {order.tax.toLocaleString()}</span>
              </div>
              <Separator className="bg-white/20" />
              <div className="flex justify-between text-lg">
                <span className="font-black italic uppercase">Total</span>
                <span className="font-black italic">Rp {order.totalAmount.toLocaleString()}</span>
              </div>
              {order.paymentMethod && (
                <div className="flex justify-between text-sm pt-2 border-t border-white/20">
                  <span className="font-bold italic">Payment Method</span>
                  <Badge className="bg-white/20 text-white font-black italic">
                    {order.paymentMethod.toUpperCase()}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {order.status === 'pending_payment' && (
              <>
                <Button
                  onClick={() => handleStatusChange('paid')}
                  className="flex-1 h-12 bg-blue-600 hover:bg-blue-500 font-black italic rounded-xl"
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Mark as Paid
                </Button>
                <Button
                  onClick={() => handleStatusChange('cancelled')}
                  variant="outline"
                  className="flex-1 h-12 border-red-300 text-red-600 hover:bg-red-50 font-black italic rounded-xl"
                >
                  <XCircle className="w-5 h-5 mr-2" />
                  Cancel Order
                </Button>
              </>
            )}
            {order.status === 'paid' && (
              <Button
                onClick={() => handleStatusChange('fulfilled')}
                className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-500 font-black italic rounded-xl"
              >
                <Truck className="w-5 h-5 mr-2" />
                Mark as Fulfilled
              </Button>
            )}
            {order.status === 'fulfilled' && (
              <Button
                onClick={() => handleStatusChange('refunded')}
                variant="outline"
                className="flex-1 h-12 border-amber-300 text-amber-600 hover:bg-amber-50 font-black italic rounded-xl"
              >
                <XCircle className="w-5 h-5 mr-2" />
                Process Refund
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
