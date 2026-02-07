import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { ApprovalStatusBadge } from "@/core/tools/ApprovalStatusBadge";
import { useSession } from "@/core/security/session";
import { treasuryService } from "@/core/services/finance/treasuryService";

export default function TreasuryMap() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fromSource, setFromSource] = useState("");
  const [toSource, setToSource] = useState("");
  const [amount, setAmount] = useState("1000000");
  const [settlementSource, setSettlementSource] = useState("");
  const [settlementAmount, setSettlementAmount] = useState("500000");
  const sources = useMemo(() => treasuryService.listSources(session.tenantId, session), [session]);
  const transfers = useMemo(() => treasuryService.listTransfers(session.tenantId, session), [session]);

  const filteredSources = sources.filter((src) =>
    search ? src.name.toLowerCase().includes(search.toLowerCase()) : true,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="TreasuryMap"
        subtitle="Cash positioning, liquidity, and settlement readiness."
        primaryAction={<Button onClick={() => setDialogOpen(true)}>Transfer</Button>}
        secondaryActions={<Input placeholder="Search accounts" value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-[220px]" />}
      />

      <WorkspacePanel title="Liquidity Overview" description="Bank, wallets, cash registers, settlement balances.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filteredSources.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Account</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Balance</th>
                <th className="p-3 text-left">Pending Settlement</th>
              </tr>
            </thead>
            <tbody>
              {filteredSources.map((src) => (
                <tr key={src.id} className="border-t">
                  <td className="p-3 font-medium text-foreground">{src.name}</td>
                  <td className="p-3 text-muted-foreground">{src.type}</td>
                  <td className="p-3 text-muted-foreground">{src.balance.toLocaleString()}</td>
                  <td className="p-3 text-muted-foreground">{src.pendingSettlement?.toLocaleString() ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <WorkspacePanel title="Pending Settlements" description="Reconcile gateway settlements to bank.">
          <div className="space-y-3">
            {filteredSources
              .filter((src) => (src.pendingSettlement ?? 0) > 0)
              .map((src) => (
                <div key={src.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <p className="font-semibold text-foreground">{src.name}</p>
                    <p className="text-xs text-muted-foreground">Pending {src.pendingSettlement?.toLocaleString()}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSettlementSource(src.id);
                      setSettlementAmount(String(src.pendingSettlement ?? 0));
                      treasuryService.reconcileSettlement(session.tenantId, session, src.id, src.pendingSettlement ?? 0);
                    }}
                  >
                    Reconcile
                  </Button>
                </div>
              ))}
          </div>
        </WorkspacePanel>

        <WorkspacePanel title="Transfers" description="Inter-account transfers and approvals.">
          <DataTableShell total={transfers.length} page={1} pageSize={5}>
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">From</th>
                  <th className="p-3 text-left">To</th>
                  <th className="p-3 text-left">Amount</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((trf) => (
                  <tr key={trf.id} className="border-t">
                    <td className="p-3 text-muted-foreground">{trf.fromSourceId}</td>
                    <td className="p-3 text-muted-foreground">{trf.toSourceId}</td>
                    <td className="p-3 text-muted-foreground">{trf.amount.toLocaleString()}</td>
                    <td className="p-3">
                      <ApprovalStatusBadge status={trf.status.toUpperCase()} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTableShell>
        </WorkspacePanel>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Transfer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={fromSource} onValueChange={setFromSource}>
              <SelectTrigger>
                <SelectValue placeholder="From source" />
              </SelectTrigger>
              <SelectContent>
                {sources.map((src) => (
                  <SelectItem key={src.id} value={src.id}>
                    {src.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={toSource} onValueChange={setToSource}>
              <SelectTrigger>
                <SelectValue placeholder="To source" />
              </SelectTrigger>
              <SelectContent>
                {sources.map((src) => (
                  <SelectItem key={src.id} value={src.id}>
                    {src.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" />
            <Button
              onClick={() => {
                treasuryService.createTransfer(session.tenantId, session, {
                  fromSourceId: fromSource || sources[0]?.id || "",
                  toSourceId: toSource || sources[1]?.id || "",
                  amount: Number(amount || "0"),
                });
                setDialogOpen(false);
              }}
            >
              Submit & Route
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
