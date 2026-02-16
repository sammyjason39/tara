import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Truck, MapPin, Clock, CheckCircle2, Package } from "lucide-react";

interface TransferTrackingModalProps {
  transferId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const TransferTrackingModal: React.FC<TransferTrackingModalProps> = ({
  transferId,
  isOpen,
  onClose,
}) => {
  // Mock tracking data
  const transfer = {
    id: transferId,
    from: "Surabaya DC",
    to: "Jakarta Store",
    status: "IN_TRANSIT",
    eta: "2 Hours",
    items: 42,
  };

  const timeline = [
    { time: "2026-02-16 08:00", status: "CREATED", desc: "Transfer request created", completed: true },
    { time: "2026-02-16 09:30", status: "PICKED", desc: "Items picked from warehouse", completed: true },
    { time: "2026-02-16 10:15", status: "DISPATCHED", desc: "Shipment dispatched", completed: true },
    { time: "2026-02-16 11:45", status: "IN_TRANSIT", desc: "En route to destination", completed: true },
    { time: "2026-02-16 13:30", status: "ARRIVED", desc: "Arrived at destination", completed: false },
    { time: "2026-02-16 14:00", status: "RECEIVED", desc: "Items received and verified", completed: false },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl rounded-[2rem]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black italic tracking-tighter uppercase">
            Transfer Tracking
          </DialogTitle>
          <DialogDescription className="font-bold italic">
            Transfer ID: {transferId}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Transfer Summary */}
          <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="text-xs text-slate-400 font-bold">Origin</div>
                  <div className="font-black italic">{transfer.from}</div>
                </div>
              </div>
              <Truck className="w-6 h-6 text-slate-400" />
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs text-slate-400 font-bold">Destination</div>
                  <div className="font-black italic">{transfer.to}</div>
                </div>
                <MapPin className="w-5 h-5 text-emerald-600" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200">
              <div>
                <div className="text-xs text-slate-400 font-bold">Status</div>
                <Badge className="bg-blue-100 text-blue-700 font-black italic mt-1">
                  {transfer.status}
                </Badge>
              </div>
              <div>
                <div className="text-xs text-slate-400 font-bold">ETA</div>
                <div className="font-black italic flex items-center gap-1 mt-1">
                  <Clock className="w-4 h-4" />
                  {transfer.eta}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 font-bold">Items</div>
                <div className="font-black italic flex items-center gap-1 mt-1">
                  <Package className="w-4 h-4" />
                  {transfer.items} Units
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Shipment Timeline</div>
            <div className="space-y-4">
              {timeline.map((event, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      event.completed ? 'bg-emerald-100' : 'bg-slate-100'
                    }`}>
                      {event.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <div className="w-3 h-3 rounded-full bg-slate-300" />
                      )}
                    </div>
                    {idx < timeline.length - 1 && (
                      <div className={`w-0.5 h-12 ${event.completed ? 'bg-emerald-200' : 'bg-slate-200'}`} />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className={`font-black italic ${event.completed ? 'text-slate-900' : 'text-slate-400'}`}>
                        {event.desc}
                      </div>
                      <div className="text-xs text-slate-400 font-bold">{event.time}</div>
                    </div>
                    <Badge className={`text-xs font-black italic ${
                      event.completed ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {event.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
