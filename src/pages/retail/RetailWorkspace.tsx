import { useNavigate } from "react-router-dom";
import { useRetail } from "./context/RetailContext";
import { 
  BarChart3, Store, Users, Clock, Globe, 
  Tag, Eye, MonitorDot, FileText, 
  Layout, Monitor, Search, AlertCircle, ArrowRight, BoxSelect, ShieldAlert,
  ChevronRight, Power
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/core/security/session";
import { Roles } from "@/core/security/roles";
import { retailService } from "@/core/services/retail/retailService";
import { RetailStore, POSDevice } from "@/core/types/retail/retail";
import { FeedbackAlert } from "@/core/tools/FeedbackAlert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

const RetailWorkspace = () => {
  const navigate = useNavigate();
  const { activeStore } = useRetail();

  const managementApps = [
    { id: "mgt-dashboard", title: "Command Center", desc: "Sales, KPIs, and store vitals", icon: BarChart3, route: "/m/retail/management/dashboard", color: "text-blue-600", bg: "bg-blue-50" },
    { id: "mgt-profile", title: "Store Profile", desc: "Identity and tax settings", icon: Store, route: "/m/retail/management/profile", color: "text-indigo-600", bg: "bg-indigo-50" },
    { id: "mgt-staff", title: "Staff Roles", desc: "Local access enforcement", icon: Users, route: "/m/retail/management/staff", color: "text-purple-600", bg: "bg-purple-50" },
    { id: "mgt-shifts", title: "Shift Control", desc: "Workforce gatekeeping", icon: Clock, route: "/m/retail/management/shifts", color: "text-green-600", bg: "bg-green-50" },
    { id: "mgt-commerce", title: "Commerce Channels", desc: "Headless & Marketplace", icon: Globe, route: "/m/retail/management/ecommerce", color: "text-cyan-600", bg: "bg-cyan-50" },
    { id: "mgt-orders", title: "Fulfillment Hub", desc: "Unified order truth", icon: BoxSelect, route: "/m/retail/management/orders", color: "text-orange-600", bg: "bg-orange-50" },
    { id: "mgt-pricing", title: "Pricing Desk", desc: "Maker-checker promotions", icon: Tag, route: "/m/retail/management/pricing", color: "text-pink-600", bg: "bg-pink-50" },
    { id: "mgt-inventory", title: "Inventory ATS", desc: "Stock visibility & buffers", icon: Eye, route: "/m/retail/management/inventory", color: "text-emerald-600", bg: "bg-emerald-50" },
    { id: "mgt-devices", title: "Device Registry", desc: "Hardware fraud monitoring", icon: MonitorDot, route: "/m/retail/management/devices", color: "text-slate-600", bg: "bg-slate-50" },
    { id: "mgt-audit", title: "Audit Ledger", desc: "Immutable transaction logs", icon: FileText, route: "/m/retail/management/audit", color: "text-red-600", bg: "bg-red-50" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 1. Welcoming Hero */}
      <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl">
         <div className="absolute top-0 right-0 p-12 opacity-5">
           <Layout className="w-80 h-80" />
         </div>
         <div className="relative z-10">
           <div className="flex items-center gap-3 mb-4">
             <Badge className="bg-blue-600 hover:bg-blue-600 px-3 py-1 font-black italic">GENESIS_MODE</Badge>
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nexus Governance Active</span>
           </div>
           <h2 className="text-4xl font-black italic tracking-tighter mb-2">Welcome to Retail Authority</h2>
           <p className="text-slate-400 max-w-xl font-medium">
             You are currently in the **Management Plane**. From here you can govern store policies, 
             monitor staff shifts, and manage distribution channels for **{activeStore?.name}**.
           </p>
         </div>
      </div>

      {/* 2. Management App Grid */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 px-2 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-orange-500" />
          Governance Applications
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {managementApps.map((app) => (
            <Card key={app.id} className="group hover:border-blue-400 hover:shadow-2xl transition-all cursor-pointer bg-white border-2 border-slate-100 rounded-3xl overflow-hidden" onClick={() => navigate(app.route)}>
              <CardContent className="p-6 space-y-4">
                <div className={`w-14 h-14 ${app.bg} rounded-2xl flex items-center justify-center ${app.color} group-hover:scale-110 group-hover:rotate-3 transition-transform`}>
                  <app.icon className="w-8 h-8" />
                </div>
                <div>
                  <div className="font-black text-slate-900 leading-tight uppercase tracking-tighter italic">{app.title}</div>
                  <div className="text-[10px] leading-tight text-slate-500 mt-1 font-bold italic">{app.desc}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 3. Operational Quick-Jump */}
      <div className="p-1 border-t border-slate-200 mt-12 bg-white rounded-[2.5rem] shadow-sm flex items-center justify-between">
        <div className="px-8 flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center">
            <Monitor className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-tighter text-slate-900 italic">Looking for the frontline?</div>
            <div className="text-[10px] text-slate-400 font-bold">Switch to Operational Plane for POS and Scanners</div>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="h-14 px-8 rounded-2xl border-2 border-indigo-100 font-black italic tracking-widest text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all gap-3"
          onClick={() => navigate('/m/retail/operational/gateway')}
        >
          GO TO OPERATIONAL MODE
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default RetailWorkspace;
