import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { PageShell } from "@/core/ui/PageShell";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { PageHeader } from "@/core/ui/PageHeader";
import { FeedbackAlert } from "@/core/tools/FeedbackAlert";
import { useSession } from "@/core/security/session";
import { orgSettingsService, OrgProfile, TenantPreferences } from "@/core/services/orgSettingsService";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Building2 } from "lucide-react";

const SETTINGS_TABS = [
  { value: "general", label: "General" },
  { value: "child-companies", label: "Child Companies" },
  { value: "taxes", label: "Taxes" },
  { value: "roles", label: "Roles" },
  { value: "integrations", label: "Integrations" },
] as const;

type SettingsTab = (typeof SETTINGS_TABS)[number]["value"];

const DEFAULT_TAB: SettingsTab = "general";

function isSettingsTab(value?: string): value is SettingsTab {
  return SETTINGS_TABS.some((tab) => tab.value === value);
}

export default function CoreSettings() {
  const navigate = useNavigate();
  const session = useSession();
  const { toast } = useToast();
  const { tab } = useParams<{ tab?: string }>();
  
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    isSettingsTab(tab) ? tab : DEFAULT_TAB,
  );
  
  const [profile, setProfile] = useState<OrgProfile | null>(null);
  const [preferences, setPreferences] = useState<TenantPreferences | null>(null);
  const [childCompanies, setChildCompanies] = useState<OrgProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [newChild, setNewChild] = useState({
    name: "",
    industry: "retail",
    country: "US",
    currency: "USD"
  });

  useEffect(() => {
    async function init() {
      try {
        const [p, pref, children] = await Promise.all([
          orgSettingsService.getProfile(session),
          orgSettingsService.getPreferences(session),
          orgSettingsService.getChildCompanies(session)
        ]);
        setProfile(p);
        setPreferences(pref);
        setChildCompanies(children);
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [session]);

  const handleCreateChildCompany = async () => {
    if (!newChild.name) return;
    setSaving(true);
    try {
      const created = await orgSettingsService.createChildCompany(session, newChild);
      setChildCompanies([created, ...childCompanies]);
      setIsAddingChild(false);
      setNewChild({ name: "", industry: "retail", country: "US", currency: "USD" });
      toast({ title: "Success", description: `Child company ${created.name} created.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create child company.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await orgSettingsService.updateProfile(session, profile);
      toast({ title: "Success", description: "Organization profile updated." });
    } catch (err) {
      toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!preferences) return;
    setSaving(true);
    try {
      await orgSettingsService.updatePreferences(session, preferences);
      toast({ title: "Success", description: "System preferences updated." });
    } catch (err) {
      toast({ title: "Error", description: "Failed to update preferences.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (isSettingsTab(tab)) {
      setActiveTab(tab);
      return;
    }
    setActiveTab(DEFAULT_TAB);
  }, [tab]);

  const handleTabChange = (value: string) => {
    if (!isSettingsTab(value)) return;
    setActiveTab(value);
    navigate(`/core/settings/${value}`);
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="h-full">
      <PageShell
        header={
          <PageHeader
            title="Settings"
            subtitle="Manage organization configuration, compliance, and access controls."
            primaryAction={
              <Button
                loading={saving}
                onClick={activeTab === 'general' ? handleSaveProfile : handleSavePreferences}
              >
                Save changes
              </Button>
            }
            secondaryActions={<Button disabled title="Not available yet" variant="outline">Reset</Button>}
          />
        }
        left={
          <div className="p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Configuration
            </div>
            <TabsList className="mt-3 flex w-full flex-col items-stretch bg-transparent p-0">
              {SETTINGS_TABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="justify-start rounded-md px-3 py-2 text-sm data-[state=active]:bg-muted data-[state=active]:text-foreground"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        }
      >
        <div className="space-y-6">
          <TabsContent value="general" className="space-y-6">
            <WorkspacePanel
              title="Organization profile"
              description="Core identity details used across documents and communications."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="org-name">Organization name</Label>
                  <Input 
                    id="org-name" 
                    value={profile?.name || ''} 
                    onChange={(e) => setProfile(p => p ? { ...p, name: e.target.value } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-legal">Legal entity</Label>
                  <Input id="org-legal" placeholder="Enter legal entity name" disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-email">Primary email</Label>
                  <Input
                    id="org-email"
                    type="email"
                    placeholder="email@company.com"
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-phone">Phone</Label>
                  <Input id="org-phone" placeholder="+1 (000) 000-0000" disabled />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-address">Registered address</Label>
                <Textarea
                  id="org-address"
                  placeholder="Street, city, state, postal code"
                  disabled
                />
              </div>
            </WorkspacePanel>

            <WorkspacePanel
              title="Locale & currency"
              description="Defaults for time zone, currency, and numbering."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Time zone</Label>
                  <Select defaultValue="utc">
                    <SelectTrigger>
                      <SelectValue placeholder="Select time zone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="utc">UTC</SelectItem>
                      <SelectItem value="america-new-york">
                        America / New York
                      </SelectItem>
                      <SelectItem value="asia-jakarta">
                        Asia / Jakarta
                      </SelectItem>
                      <SelectItem value="asia-singapore">
                        Asia / Singapore
                      </SelectItem>
                      <SelectItem value="europe-london">
                        Europe / London
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select 
                    value={profile?.currency?.toLowerCase() || 'usd'}
                    onValueChange={(val) => setProfile(p => p ? { ...p, currency: val.toUpperCase() } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usd">USD - US Dollar</SelectItem>
                      <SelectItem value="sgd">
                        SGD - Singapore Dollar
                      </SelectItem>
                      <SelectItem value="idr">
                        IDR - Indonesian Rupiah
                      </SelectItem>
                      <SelectItem value="eur">EUR - Euro</SelectItem>
                      <SelectItem value="gbp">GBP - British Pound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </WorkspacePanel>

            <WorkspacePanel
              title="Governance"
              description="Approval requirements for critical actions."
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="text-sm font-medium">
                      Require approval for refunds
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Force manager approval for any refund workflow.
                    </p>
                  </div>
                  <Switch 
                    checked={preferences?.require_refund_approval || false} 
                    onCheckedChange={(checked) => setPreferences(prev => prev ? { ...prev, require_refund_approval: checked } : null)}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="text-sm font-medium">
                      Dual control for role changes
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Require a second approver for access changes.
                    </p>
                  </div>
                  <Switch 
                    checked={preferences?.dual_control_roles || false} 
                    onCheckedChange={(checked) => setPreferences(prev => prev ? { ...prev, dual_control_roles: checked } : null)}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="text-sm font-medium">
                      Biometric Attendance
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Enable integration with hardware biometric devices for staff clock-in.
                    </p>
                  </div>
                  <Switch 
                    checked={preferences?.enable_biometric_attendance || false} 
                    onCheckedChange={(checked) => setPreferences(prev => prev ? { ...prev, enable_biometric_attendance: checked } : null)}
                  />
                </div>
              </div>
            </WorkspacePanel>
          </TabsContent>

          <TabsContent value="child-companies" className="space-y-6">
            <WorkspacePanel
              title="Child Companies"
              description="Manage subsidiary entities within your organization hierarchy."
              action={
                <Dialog open={isAddingChild} onOpenChange={setIsAddingChild}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" /> Add Company
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Child Company</DialogTitle>
                      <DialogDescription>
                        Create a new subsidiary linked to this root organization.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="child-name">Company name</Label>
                        <Input
                          id="child-name"
                          value={newChild.name}
                          onChange={(e) => setNewChild({ ...newChild, name: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>Industry</Label>
                          <Select
                            value={newChild.industry}
                            onValueChange={(val) => setNewChild({ ...newChild, industry: val })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="retail">Retail</SelectItem>
                              <SelectItem value="hospitality">Hospitality</SelectItem>
                              <SelectItem value="manufacturing">Manufacturing</SelectItem>
                              <SelectItem value="services">Services</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label>Country</Label>
                          <Select
                            value={newChild.country}
                            onValueChange={(val) => setNewChild({ ...newChild, country: val })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="US">United States</SelectItem>
                              <SelectItem value="ID">Indonesia</SelectItem>
                              <SelectItem value="SG">Singapore</SelectItem>
                              <SelectItem value="GB">United Kingdom</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddingChild(false)}>Cancel</Button>
                      <Button loading={saving} onClick={handleCreateChildCompany}>Create</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              }
            >
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Industry</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {childCompanies.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          No child companies found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      childCompanies.map((child: any) => (
                        <TableRow key={child.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                              {child.name}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{child.code}</TableCell>
                          <TableCell className="capitalize">{child.industry}</TableCell>
                          <TableCell>{child.country}</TableCell>
                          <TableCell>
                            <Badge variant={child.status === 'active' ? 'success' : 'secondary'}>
                              {child.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </WorkspacePanel>
          </TabsContent>

          <TabsContent value="taxes" className="space-y-6">
            <WorkspacePanel
              title="Tax configuration"
              description="Define default rates and rounding rules."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tax-rate">Default tax rate (%)</Label>
                  <Input id="tax-rate" type="number" placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Rounding method</Label>
                  <Select defaultValue="standard">
                    <SelectTrigger>
                      <SelectValue placeholder="Select rounding" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">
                        Standard rounding
                      </SelectItem>
                      <SelectItem value="ceil">Round up</SelectItem>
                      <SelectItem value="floor">Round down</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Tax-inclusive pricing</p>
                  <p className="text-xs text-muted-foreground">
                    Prices already include tax.
                  </p>
                </div>
                <Switch />
              </div>
            </WorkspacePanel>
          </TabsContent>

          <TabsContent value="roles" className="space-y-6">
            <WorkspacePanel
              title="Roles & permissions"
              description="Define access roles for administrators and operators."
            >
              <div className="flex items-center justify-between rounded-lg border border-dashed p-6">
                <div>
                  <p className="text-sm font-medium">No custom roles yet</p>
                  <p className="text-xs text-muted-foreground">
                    Create roles to control access by team and function.
                  </p>
                </div>
                <Button disabled title="Not available yet" variant="outline">Create role</Button>
              </div>
            </WorkspacePanel>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6">
            <WorkspacePanel
              title="Integrations"
              description="Connect services for billing, analytics, and messaging."
            >
              <div className="flex items-center justify-between rounded-lg border border-dashed p-6">
                <div>
                  <p className="text-sm font-medium">
                    No integrations connected
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Add approved providers to extend your workspace.
                  </p>
                </div>
                <Button disabled title="Not available yet" variant="outline">Browse integrations</Button>
              </div>
            </WorkspacePanel>
          </TabsContent>
        </div>
      </PageShell>
    </Tabs>
  );
}
