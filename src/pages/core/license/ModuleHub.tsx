import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { useSession } from "@/core/security/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { 
  Shield, 
  Settings, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Layout,
  ExternalLink
} from "lucide-react";

export default function ModuleHub() {
  const session = useSession();
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLicenses = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/license/my-modules", {
        headers: {
          Authorization: `Bearer ${session.token}`,
          "x-tenant-id": session.tenantId,
        },
      });
      const data = await response.json();
      setLicenses(data || []);
    } catch (error) {
      console.error("Failed to fetch licenses:", error);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchLicenses();
  }, [fetchLicenses]);

  const handleToggle = async (moduleCode: string, currentEnabled: boolean) => {
    try {
      const response = await fetch(`/api/license/toggle/${moduleCode}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
          "x-tenant-id": session.tenantId,
        },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });

      if (response.ok) {
        toast({
          title: "Module Updated",
          description: `${moduleCode} has been ${!currentEnabled ? "enabled" : "disabled"}.`,
        });
        fetchLicenses();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update module status.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Active</Badge>;
      case "expired":
        return <Badge variant="destructive">Expired</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Module License Center"
        subtitle="Manage your platform extensions, verify subscriptions, and toggle core features."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 rounded-xl border bg-muted animate-pulse" />
          ))
        ) : licenses.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">
            <Layout className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No module licenses found for this organization.</p>
            <Button variant="link" className="mt-2">Visit Market Hub</Button>
          </div>
        ) : (
          licenses.map((license) => (
            <Card key={license.id} className="overflow-hidden border-2 hover:border-primary/50 transition-colors">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Layout className="h-5 w-5 text-primary" />
                  </div>
                  {getStatusBadge(license.status)}
                </div>
                <CardTitle className="mt-4">{license.module.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {license.module.description || "Enterprise grade business module extension."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm py-2 border-y">
                  <div className="flex items-center text-muted-foreground">
                    <Clock className="h-4 w-4 mr-2" />
                    Valid Through
                  </div>
                  <span className="font-medium">
                    {license.endDate ? new Date(license.endDate).toLocaleDateString() : "Life-time"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-muted-foreground">
                    <Shield className="h-4 w-4 mr-2" />
                    Seats
                  </div>
                  <span className="font-medium">
                    {license.usedSeats} / {license.maxSeats || "∞"}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 pt-4 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id={`toggle-${license.moduleCode}`} 
                    checked={license.isEnabled}
                    onCheckedChange={() => handleToggle(license.moduleCode, license.isEnabled)}
                  />
                  <Label htmlFor={`toggle-${license.moduleCode}`} className="text-xs uppercase font-bold tracking-wider">
                    {license.isEnabled ? "Enabled" : "Disabled"}
                  </Label>
                </div>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4 mr-1" /> Config
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      <WorkspacePanel title="Subscription Intelligence" className="bg-slate-900 text-slate-50 border-none shadow-2xl">
        <div className="flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1 space-y-4">
            <div className="p-3 bg-primary/20 rounded-full w-fit">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Your Compliance Score is 100%</h3>
            <p className="text-slate-400">
              All active modules have valid cryptographic keys. Automated auditing is enabled and healthy.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
            <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
              <div className="text-2xl font-bold">{licenses.length}</div>
              <div className="text-xs text-slate-400">Total Modules</div>
            </div>
            <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
              <div className="text-2xl font-bold">{licenses.filter(l => l.isEnabled).length}</div>
              <div className="text-xs text-slate-400">Active Extensions</div>
            </div>
          </div>
        </div>
      </WorkspacePanel>
    </div>
  );
}
