import React, { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/core/ui/PageHeader";
import { RetailOrder, OrderStatus } from "@/core/types/retail/retail";
import { retailService } from "@/core/services/retail/retailService";
import { useSession } from "@/core/security/session";
import { useToast } from "@/hooks/use-toast";
import { OrderDetailModal } from "./modals/OrderDetailModal";

import {
  PackageCheck,
  Truck,
  RotateCcw,
  Zap,
  History,
  ShieldAlert,
  Clock,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// New sub-components
import { OrderRacetrack } from "./order-fulfillment/OrderRacetrack";
import { LogisticsRadar } from "./order-fulfillment/LogisticsRadar";
import { BufferHealthCard } from "./order-fulfillment/BufferHealthCard";

const OrderFulfillment = () => {
  const session = useSession();
  const { toast } = useToast();
  const [orders, setOrders] = useState<RetailOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<RetailOrder | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [activeQueue, setActiveQueue] = useState("ALL");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const data = await retailService.listOrders(session.tenantId!, session);
        setOrders(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [session.tenantId, session]);

  const stats = useMemo(() => {
    const pending = orders.filter((o) => o.status === "paid").length;
    const priority = orders.filter((o) => o.totalAmount > 1000000).length;
    return { pending, priority };
  }, [orders]);

  const handleOrderClick = (order: RetailOrder) => {
    setSelectedOrder(order);
    setIsOrderModalOpen(true);
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await retailService.updateOrderStatus(
        session.tenantId!,
        session,
        orderId,
        newStatus,
      );
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
      );
      toast({
        title: "Signal Synchronized",
        description: `Order ${orderId} successfully transitioned to ${newStatus}.`,
      });
    } catch (e) {
      console.error(e);
      toast({
        title: "Sync Failure",
        description: "Failed to propagate order status change to the ledger.",
        variant: "destructive",
      });
    }
  };


  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RotateCcw className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm font-black italic uppercase tracking-widest text-slate-400">
            Syncing Pipeline Data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="px-8 py-6 border-b bg-white shrink-0 flex items-center justify-between">
        <PageHeader
          title="Multi-Channel Fulfillment Engine"
          subtitle={`Node: ${session.locationId || "CENTRAL_HUB"} • Velocity: 94.2% • SLA Gaps: MINIMAL`}
        />
        <div className="flex items-center gap-3">
          <Button disabled title="Not available yet"
            variant="outline"
            className="h-11 rounded-xl px-4 font-black italic border-slate-200 text-xs uppercase tracking-widest gap-2"
          >
            <History className="w-3.5 h-3.5" /> Manifest Archive
          </Button>
          <Button disabled title="Not available yet" className="h-11 px-6 rounded-xl bg-slate-900 font-black italic uppercase text-xs tracking-widest gap-2 shadow-lg shadow-slate-900/10 hover:bg-slate-800">
            <Zap className="w-4 h-4 text-amber-400" /> Start Batch Pick
          </Button>
        </div>
      </div>

      <div className="flex-1 p-8 lg:p-12 bg-slate-50/50">
        <div className="max-w-7xl mx-auto space-y-12">
          {/* Logistics Pulse Vitals */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="rounded-[2rem] p-6 bg-white border-slate-200 shadow-xl border-b-4 border-b-slate-100 hover:border-b-blue-600 transition-all">
              <div className="flex justify-between items-start mb-6">
                <div className="p-4 rounded-2xl bg-blue-50 text-blue-600">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <Badge className="bg-blue-50 text-blue-700 font-black italic text-[8px] uppercase tracking-widest border-none">
                  Active
                </Badge>
              </div>
              <div className="text-[10px] font-black italic uppercase tracking-widest text-slate-400 mb-1">
                Queue Depth
              </div>
              <div className="text-3xl font-black italic tracking-tighter text-slate-900">
                {stats.pending} Orders
              </div>
              <div className="text-[10px] font-bold italic text-slate-400 mt-2 uppercase flex items-center gap-1 text-emerald-600">
                <Clock className="w-3 h-3" /> TAT: 12m 45s (Target Met)
              </div>
            </Card>

            <Card className="rounded-[2rem] p-6 bg-white border-slate-200 shadow-xl border-b-4 border-b-slate-100 hover:border-b-amber-500 transition-all">
              <div className="flex justify-between items-start mb-6">
                <div className="p-4 rounded-2xl bg-amber-50 text-amber-600">
                  <Truck className="w-5 h-5" />
                </div>
                <Badge className="bg-amber-50 text-amber-700 font-black italic text-[8px] uppercase tracking-widest border-none">
                  Awaiting
                </Badge>
              </div>
              <div className="text-[10px] font-black italic uppercase tracking-widest text-slate-400 mb-1">
                Courier Slant
              </div>
              <div className="text-3xl font-black italic tracking-tighter text-slate-900">
                12 Pickups
              </div>
              <div className="text-[10px] font-bold italic text-slate-400 mt-2 uppercase">
                Next: JNE Express (5m)
              </div>
            </Card>

            <Card className="rounded-[2rem] p-6 bg-white border-slate-200 shadow-xl border-b-4 border-b-slate-100 hover:border-b-indigo-600 transition-all">
              <div className="flex justify-between items-start mb-6">
                <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600">
                  <Zap className="w-5 h-5" />
                </div>
                <Badge
                  variant="destructive"
                  className="font-black italic text-[8px] uppercase tracking-widest"
                >
                  Priority
                </Badge>
              </div>
              <div className="text-[10px] font-black italic uppercase tracking-widest text-slate-400 mb-1">
                High-Value Stream
              </div>
              <div className="text-3xl font-black italic tracking-tighter text-slate-900">
                {stats.priority} Orders
              </div>
              <div className="text-[10px] font-bold italic text-slate-400 mt-2 uppercase">
                {">"} Rp 1.0M Allocation
              </div>
            </Card>

            <Card className="rounded-[2rem] p-6 bg-slate-900 text-white shadow-2xl relative overflow-hidden group">
              <ShieldAlert className="absolute -right-8 -bottom-8 w-32 h-32 opacity-10 group-hover:rotate-12 transition-transform" />
              <div className="relative z-10">
                <div className="text-[10px] font-black italic uppercase tracking-widest text-indigo-400 mb-4">
                  Pipeline Health
                </div>
                <div className="text-4xl font-black italic tracking-tighter text-emerald-400">
                  98.2%
                </div>
                <div className="text-[10px] font-bold italic opacity-60 mt-4 uppercase">
                  Fulfillment Accuracy Index
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column (9 cols) - The Order Racetrack */}
            <div className="lg:col-span-9 space-y-8">
              <OrderRacetrack
                orders={orders}
                onOrderClick={handleOrderClick}
                activeQueue={activeQueue}
                setActiveQueue={setActiveQueue}
              />
            </div>

            {/* Right Column (3 cols) - Buffer Health & Logistics Radar */}
            <div className="lg:col-span-3 space-y-8 flex flex-col">
              <LogisticsRadar />
              <BufferHealthCard />
            </div>
          </div>
        </div>
      </div>

      <OrderDetailModal
        order={selectedOrder}
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
};

export default OrderFulfillment;
