import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { useSession } from "@/core/security/session";
import { marketingService } from "@/core/services/marketing/marketingService";
import type {
  ConnectedAccount,
  ConnectedProvider,
  ConnectionStatus,
} from "@/core/types/marketing/marketing";

const PROVIDERS: ConnectedProvider[] = ["META", "GOOGLE"];

export default function ConnectedAccountsDesk() {
  const session = useSession();
  const [provider, setProvider] = useState<ConnectedProvider>("META");
  const [accountName, setAccountName] = useState("");
  const [scopes, setScopes] = useState("ads_read,leads_retrieval");
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);

  const refresh = useCallback(async () => {
    try {
      const a = await marketingService.listConnectedAccounts(session.tenantId, session);
      setAccounts(a);
    } catch (err) {
      console.error("Failed to fetch connected accounts:", err);
    } finally {
      setLoading(false);
    }
  }, [session.tenantId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setStatus = async (accountId: string, status: ConnectionStatus) => {
    await marketingService.updateAccountStatus(session.tenantId, session, accountId, status);
    refresh();
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Loading accounts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Connected Accounts"
        subtitle="OAuth account connection, token health, and external ad platform permissions."
      />

      <WorkspacePanel title="Connect Provider" description="Register Meta or Google account credentials (mock OAuth).">
        <div className="grid gap-3 md:grid-cols-4">
          <Select value={provider} onValueChange={(value: ConnectedProvider) => setProvider(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Provider" />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Account name"
            value={accountName}
            onChange={(event) => setAccountName(event.target.value)}
          />
          <Input
            placeholder="Scopes (comma separated)"
            value={scopes}
            onChange={(event) => setScopes(event.target.value)}
          />
          <Button
            onClick={async () => {
              if (!accountName) return;
              await marketingService.connectAccount(session.tenantId, session, {
                provider,
                accountName,
                scopes: scopes.split(",").map((item) => item.trim()).filter(Boolean),
              });
              setAccountName("");
              refresh();
            }}
          >
            Connect
          </Button>
        </div>
      </WorkspacePanel>

      <WorkspacePanel title="Connected Accounts Panel" description="Connection status, token expiry, and sync health.">
        <DataTableShell total={accounts.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Provider</th>
                <th className="p-3 text-left">Account</th>
                <th className="p-3 text-left">Token Expiry</th>
                <th className="p-3 text-left">Last Sync</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((item: ConnectedAccount) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3 font-medium">{item.provider}</td>
                  <td className="p-3 text-muted-foreground">{item.accountName}</td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(item.tokenExpiresAt).toLocaleString()}
                  </td>
                  <td className="p-3 text-muted-foreground">
                     {item.lastSyncAt ? new Date(item.lastSyncAt).toLocaleString() : "Never"}
                  </td>
                  <td className="p-3">
                    <Badge
                      variant={
                        item.status === "CONNECTED"
                          ? "secondary"
                          : item.status === "EXPIRED"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {item.status}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setStatus(item.id, "CONNECTED")}
                      >
                        Mark Connected
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setStatus(item.id, "EXPIRED")}
                      >
                        Mark Expired
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setStatus(item.id, "DISCONNECTED")}
                      >
                        Disconnect
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>
    </div>
  );
}
