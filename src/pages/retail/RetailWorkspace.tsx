import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  ShoppingCart, 
  BarChart3, 
  ShieldCheck, 
  Package,
  ArrowRight,
  Store,
  Layout
} from "lucide-react";
import { PageHeader } from "@/core/ui/PageHeader";
import { useSession } from "@/core/security/session";
import { Roles } from "@/core/security/roles";

export default function RetailWorkspace() {
  const session = useSession();
  const navigate = useNavigate();

  const APPS = [
    {
      id: "pos",
      title: "POS Terminal",
      description: "Fast checkout, scanning, and payments",
      icon: ShoppingCart,
      route: "/m/retail/pos",
      color: "bg-blue-50 text-blue-600",
      roles: [Roles.SUPERADMIN, Roles.OWNER, Roles.COMPANY_ADMIN, Roles.HR_STAFF]
    },
    {
      id: "management",
      title: "Command Center",
      description: "Analytics, KPIs, and store vitals",
      icon: BarChart3,
      route: "/m/retail/management",
      color: "bg-green-50 text-green-600",
      roles: [Roles.SUPERADMIN, Roles.OWNER, Roles.COMPANY_ADMIN]
    },
    {
      id: "verification",
      title: "Verification Desk",
      description: "Secure receipt and ticket validation",
      icon: ShieldCheck,
      route: "/m/retail/verification",
      color: "bg-purple-50 text-purple-600",
      roles: [Roles.SUPERADMIN, Roles.OWNER, Roles.COMPANY_ADMIN, Roles.HR_STAFF]
    },
    {
      id: "inventory",
      title: "Stock & Receiving",
      description: "Manage inbound shipments and audits",
      icon: Package,
      route: "/m/retail/inventory",
      color: "bg-orange-50 text-orange-600",
      roles: [Roles.SUPERADMIN, Roles.OWNER, Roles.COMPANY_ADMIN, Roles.HR_STAFF]
    }
  ];

  const allowedApps = APPS.filter(app => app.roles.includes(session.role as any));

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto p-4 md:p-8">
      <PageHeader 
        title="Retail Control Authority" 
        subtitle="Gateway to your store's operational and management planes."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {allowedApps.map(app => (
          <Card 
            key={app.id} 
            className="group cursor-pointer border-none shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all"
            onClick={() => navigate(app.route)}
          >
            <CardHeader className="flex flex-row items-center gap-4 p-6">
              <div className={`${app.color} p-4 rounded-2xl transition-transform group-hover:scale-110`}>
                <app.icon className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl">{app.title}</CardTitle>
                <CardDescription className="mt-1">{app.description}</CardDescription>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="mt-12 p-8 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
             <div className="bg-white p-3 rounded-xl shadow-sm">
                <Store className="w-6 h-6 text-slate-400" />
             </div>
             <div>
                <h4 className="font-semibold text-slate-800">Operational Continuity</h4>
                <p className="text-sm text-slate-500">Retail license is active. 2 online terminals detected.</p>
             </div>
          </div>
          <div className="flex gap-3">
             <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Context</span>
                <span className="text-sm font-semibold text-slate-700">Downtown Flagship (DT-001)</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
