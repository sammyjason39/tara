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

const SETTINGS_TABS = [
  { value: "general", label: "General" },
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
  const { tab } = useParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    isSettingsTab(tab) ? tab : DEFAULT_TAB,
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearStatus = () => {
    setStatusMessage(null);
    setErrorMessage(null);
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
                onClick={() => {
                  try {
                    // Logic to save settings would go here.
                    setStatusMessage("Settings updated successfully.");
                  } catch (err) {
                    setErrorMessage("Failed to update settings.");
                  }
                }}
              >
                Save changes
              </Button>
            }
            secondaryActions={<Button variant="outline">Reset</Button>}
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
          <FeedbackAlert message={statusMessage} error={errorMessage} onClear={clearStatus} />
          <TabsContent value="general" className="space-y-6">
            <WorkspacePanel
              title="Organization profile"
              description="Core identity details used across documents and communications."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="org-name">Organization name</Label>
                  <Input id="org-name" placeholder="Enter organization name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-legal">Legal entity</Label>
                  <Input id="org-legal" placeholder="Enter legal entity name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-email">Primary email</Label>
                  <Input
                    id="org-email"
                    type="email"
                    placeholder="email@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-phone">Phone</Label>
                  <Input id="org-phone" placeholder="+1 (000) 000-0000" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-address">Registered address</Label>
                <Textarea
                  id="org-address"
                  placeholder="Street, city, state, postal code"
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
                  <Select defaultValue="usd">
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
                  <Switch />
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
                  <Switch />
                </div>
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
                <Button variant="outline">Create role</Button>
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
                <Button variant="outline">Browse integrations</Button>
              </div>
            </WorkspacePanel>
          </TabsContent>
        </div>
      </PageShell>
    </Tabs>
  );
}
