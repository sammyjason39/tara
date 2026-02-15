import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Monitor, 
  BarChart3, 
  Receipt, 
  History,
  AlertCircle,
  TrendingUp,
  Activity
} from "lucide-react";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { useSession } from "@/core/security/session";
import { retailService } from "@/core/services/retail/retailService";
import type { RetailOrder } from "@/core/types/retail/retail";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { ApprovalStatusBadge } from "@/core/tools/ApprovalStatusBadge";

export default function RetailManagement() {
  const session = useSession();
  const [orders, setOrders] = useState<RetailOrder[]>([]);

  useEffect(() => {
    try {
      const orderList = retailService.listOrders(session.tenantId);
      setOrders(orderList);
    } catch (err) {
      console.error("Management Failed to load", err);
    }
  }, []);

  const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);

  const kpis = [
    { label: "Gross Sales", value: `$${totalSales.toLocaleString()}`, icon: TrendingUp, color: "text-blue-600" },
    { label: "Transaction Count", value: orders.length, icon: Receipt, color: "text-green-600" },
    { label: "Active Terminals", value: "2/2", icon: Monitor, color: "text-orange-600" },
    { label: "Edge Pulse", value: "Optimal", icon: Activity, color: "text-purple-600" },
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 md:p-6">
      <PageHeader title="Retail Command Center" subtitle="Global Operational Oversight" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <Card key={idx} className="border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">{kpi.label}</p>
                  <h3 className="text-2xl font-bold mt-1">{kpi.value}</h3>
                </div>
                <div className={`${kpi.color} bg-slate-50 p-2 rounded-lg`}>
                  <kpi.icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center"><BarChart3 className="w-4 h-4 mr-2" /> Daily Performance Velocity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] bg-slate-50 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground italic">
              [Operational sales velocity chart visualization]
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center"><AlertCircle className="w-4 h-4 mr-2" /> System Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-green-50 rounded flex justify-between items-center text-sm">
              <span>Cloud Sync</span><Badge className="bg-green-100 text-green-700">ONLINE</Badge>
            </div>
            <div className="p-3 bg-blue-50 rounded flex justify-between items-center text-sm">
              <span>License Status</span><Badge className="bg-blue-100 text-blue-700">ACTIVE</Badge>
            </div>
            <div className="p-3 bg-slate-50 rounded flex justify-between items-center text-sm">
              <span>Security Auth</span><Badge variant="outline">STORY-ENABLED</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <WorkspacePanel title="Audit Ledger" description="Immutable transaction log">
        <DataTableShell total={orders.length} page={1} pageSize={10}>
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-xs text-muted-foreground border-b uppercase">
              <tr>
                <th className="p-4">ID</th>
                <th className="p-4">Total</th>
                <th className="p-4">Status</th>
                <th className="p-4">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className="border-b hover:bg-slate-50/50">
                  <td className="p-4 font-mono text-blue-600">{o.id}</td>
                  <td className="p-4 font-bold">${o.totalAmount.toFixed(2)}</td>
                  <td className="p-4"><ApprovalStatusBadge status={o.status === 'paid' ? 'APPROVED' : 'PENDING'} /></td>
                  <td className="p-4 text-muted-foreground text-xs">{new Date(o.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>
    </div>
  );
}
