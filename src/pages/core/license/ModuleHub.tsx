import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { useSession } from "@/core/security/session";
import { apiRequest } from "@/core/api/apiClient";
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
      const data = await apiRequest<any[]>("/license/my-modules", "GET", session);
      setLicenses(data || []);
    } catch (error: any) {
      console.error("Failed to fetch licenses:", error);
      toast({
        title: "Connection Error",
        description: error.message || "Failed to load module licenses.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchLicenses();
  }, [fetchLicenses]);

  const handleToggle = async (moduleCode: string, currentEnabled: boolean) => {
    try {
      await apiRequest(`/license/toggle/${moduleCode}`, "POST", session, { 
        enabled: !currentEnabled 
      });
      
      toast({
        title: "Module Updated",
        description: `${moduleCode} has been ${!currentEnabled ? "enabled" : "disabled"}.`,
      });
      fetchLicenses();
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Could not change module status.",
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
        title="Modules Activation Center"
        subtitle="Manage platform extensions and industry verticals. Core modules are always active."
      />

      {(() => {
        const coreCodes = ["finance", "hr", "it", "procurement", "inventory", "sales", "marketing"];
        const coreModules = licenses.filter(l => coreCodes.includes(l.moduleCode.toLowerCase()));
        const industryModules = licenses.filter(l => !coreCodes.includes(l.moduleCode.toLowerCase()));

        return (
          <div className="space-y-12">
            {/* Industry Verticals Segment */}
            <section className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <Layout className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold">Industry Verticals</h2>
                <Badge variant="secondary" className="ml-2">Dynamic Activation</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {industryModules.map((license) => (
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
                        {license.module.description || "Industry-specific business flow."}
                      </CardDescription>
                    </CardHeader>
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
                    </CardFooter>
                  </Card>
                ))}
                {industryModules.length === 0 && !loading && (
                    <div className="col-span-full py-8 text-center text-muted-foreground border-2 border-dashed rounded-xl">
                        <p>No industry modules available for activation.</p>
                    </div>
                )}
              </div>
            </section>

            {/* Platform Core Segment */}
            <section className="space-y-6 opacity-80">
              <div className="flex items-center gap-2 border-b pb-2">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-xl font-bold text-muted-foreground">Platform Core</h2>
                <Badge variant="outline" className="ml-2">Always Active</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {coreModules.map((license) => (
                  <Card key={license.id} className="overflow-hidden border bg-muted/20 grayscale-[0.5]">
                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-start">
                        <div className="p-2 rounded-lg bg-muted">
                          <Shield className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <Badge variant="outline" className="bg-background">Core System</Badge>
                      </div>
                      <CardTitle className="mt-4 text-muted-foreground">{license.module.name}</CardTitle>
                      <CardDescription>
                        Standard departmental service.
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="bg-muted/10 pt-4 flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-black uppercase">
                          Permanent
                        </Badge>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </section>
          </div>
        );
      })()}

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
