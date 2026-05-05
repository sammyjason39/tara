import { useNavigate } from "react-router-dom";
import { useRetail } from "../context/RetailContext";
import {
  BarChart3,
  Store,
  Users,
  Clock,
  Globe,
  Tag,
  Eye,
  MonitorDot,
  FileText,
  Layout,
  Monitor,
  Search,
  AlertCircle,
  ArrowRight,
  BoxSelect,
  ShieldAlert,
  ChevronRight,
  Power,
  Settings,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/core/security/session";
import { Roles } from "@/core/security/roles";
import { retailService } from "@/core/services/retail/retailService";
import { RetailStore, POSDevice } from "@/core/types/retail/retail";
import { FeedbackAlert } from "@/core/tools/FeedbackAlert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { GenesisGuard } from "../components/GenesisGuard";

const RetailWorkspace = () => {
  const navigate = useNavigate();
  const { activeStore, activeChannel } = useRetail();

  const appSections = [
    {
      title: "Core Governance",
      apps: [
        { id: "mgt-dashboard", title: "Command Center", desc: "Sales & KPIs", icon: BarChart3, route: "/m/retail/management/dashboard", color: "text-blue-600", bg: "bg-blue-50" },
        { id: "mgt-profile", title: "Store Profile", desc: "Identity & Tax", icon: Store, route: "/m/retail/management/profile", color: "text-indigo-600", bg: "bg-indigo-50" },
        { id: "mgt-audit", title: "Audit Ledger", desc: "Transaction logs", icon: ShieldAlert, route: "/m/retail/management/audit", color: "text-red-600", bg: "bg-red-50" },
      ]
    },
    {
      title: "Inventory & Fulfilment",
      apps: [
        { id: "mgt-orders", title: "Fulfillment Hub", desc: "Unified order truth", icon: BoxSelect, route: "/m/retail/management/orders", color: "text-orange-600", bg: "bg-orange-50" },
        { id: "mgt-inventory", title: "Inventory ATS", desc: "Stock visibility", icon: Eye, route: "/m/retail/management/inventory", color: "text-emerald-600", bg: "bg-emerald-50" },
        { id: "mgt-pricing", title: "Pricing Desk", desc: "Maker-checker promos", icon: Tag, route: "/m/retail/management/pricing", color: "text-pink-600", bg: "bg-pink-50" },
        { id: "mgt-prs", title: "Stock Request", desc: "Purchase requests", icon: ShoppingCart, route: "/m/retail/management/prs?dept=RETAIL", color: "text-amber-600", bg: "bg-amber-50" },
        { id: "ops-receiving", title: "Stock Intake", desc: "Goods receiving", icon: MonitorDot, route: "/m/retail/operational/receiving", color: "text-slate-600", bg: "bg-slate-50" },
        { id: "ops-opname", title: "Stock Opname", desc: "Audit & counts", icon: BoxSelect, route: "/m/retail/operational/opname", color: "text-blue-600", bg: "bg-blue-50" },
      ]
    },
    {
      title: "Workforce & Compliance",
      apps: [
        { id: "mgt-shifts", title: "Shift Control", desc: "Shift gatekeeping", icon: Clock, route: "/m/retail/management/shifts", color: "text-green-600", bg: "bg-green-50" },
        { id: "mgt-staff", title: "Staff Roles", desc: "Access enforcement", icon: Users, route: "/m/retail/management/staff", color: "text-purple-600", bg: "bg-purple-50" },
        { id: "mgt-schedule", title: "Staff Schedule", desc: "Roster management", icon: FileText, route: "/m/retail/management/schedule", color: "text-sky-600", bg: "bg-sky-50" },
        { id: "mgt-attendance", title: "Attendance", desc: "Time tracking", icon: Clock, route: "/m/retail/management/attendance", color: "text-emerald-600", bg: "bg-emerald-50" },
        { id: "mgt-portal", title: "Staff Portal", desc: "Employee self-service", icon: Users, route: "/m/retail/management/portal", color: "text-indigo-600", bg: "bg-indigo-50" },
      ]
    },
    {
      title: "Infrastructure & Logs",
      apps: [
        { id: "mgt-devices", title: "Device Registry", desc: "Hardware monitor", icon: MonitorDot, route: "/m/retail/management/devices", color: "text-slate-600", bg: "bg-slate-50" },
        { id: "mgt-infrastructure", title: "Infra Control", desc: "Network & settings", icon: Globe, route: "/m/retail/management/infrastructure", color: "text-cyan-600", bg: "bg-cyan-50" },
        { id: "mgt-admin", title: "Administrative", desc: "System settings", icon: Layout, route: "/m/retail/management/admin", color: "text-slate-700", bg: "bg-slate-100" },
        { id: "mgt-logs", title: "System Logs", desc: "Activity history", icon: Search, route: "/m/retail/management/logs?scope=RETAIL", color: "text-slate-500", bg: "bg-slate-50" },
        { id: "mgt-workflow", title: "Workflow Inbox", desc: "Approval tasks", icon: AlertCircle, route: "/m/retail/management/workflow?scope=RETAIL", color: "text-amber-700", bg: "bg-amber-50" },
      ]
    },
  ];

  return (
    <GenesisGuard>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* 1. Welcoming Hero */}
        <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-12 opacity-5">
            <Layout className="w-80 h-80" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <Badge className="bg-blue-600 hover:bg-blue-600 px-3 py-1 font-black italic">
                GENESIS_MODE
              </Badge>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Zenvix Governance Active
              </span>
            </div>
            <h2 className="text-4xl font-black italic tracking-tighter mb-2">
              Welcome to Retail Authority
            </h2>
            <p className="text-slate-400 max-w-xl font-medium">
              You are currently in the **Management Plane**. From here you can
              govern store policies, monitor staff shifts, and manage
              distribution channels for **
              {activeStore?.name || activeChannel?.name || "Global Context"}**.
            </p>
          </div>
        </div>

        {/* 2. Management App Grid */}
        <div className="space-y-12">
          {appSections.map((section) => (
            <div key={section.title} className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-[0.25em] text-slate-400 px-4 flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
                {section.title}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {section.apps.map((app) => (
                  <Card
                    key={app.id}
                    className="group hover:border-blue-400 hover:shadow-2xl transition-all cursor-pointer bg-white border-2 border-slate-100 rounded-[2rem] overflow-hidden"
                    onClick={() => navigate(app.route)}
                  >
                    <CardContent className="p-6 space-y-4">
                      <div
                        className={`w-14 h-14 ${app.bg} rounded-2xl flex items-center justify-center ${app.color} group-hover:scale-110 group-hover:rotate-3 transition-transform`}
                      >
                        <app.icon className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="font-black text-slate-900 leading-tight uppercase tracking-tighter italic text-sm">
                          {app.title}
                        </div>
                        <div className="text-[10px] leading-tight text-slate-500 mt-1 font-bold italic truncate">
                          {app.desc}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 3. Operational Quick-Jump */}
        <div className="p-1 border-t border-slate-200 mt-12 bg-white rounded-[2.5rem] shadow-sm flex items-center justify-between">
          <div className="px-8 flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center">
              <Monitor className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-tighter text-slate-900 italic">
                Looking for the frontline?
              </div>
              <div className="text-[10px] text-slate-400 font-bold">
                Switch to Operational Plane for POS and Scanners
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            className="h-14 px-8 rounded-2xl border-2 border-indigo-100 font-black italic tracking-widest text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all gap-3"
            onClick={() => navigate("/m/retail/operational/gateway")}
          >
            GO TO OPERATIONAL MODE
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </GenesisGuard>
  );
};

export default RetailWorkspace;
