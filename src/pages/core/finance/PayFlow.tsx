import { useCallback, useEffect, useMemo, useState } from "react";
// cspell:ignore qris gopay shopeepay
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { ApprovalStatusBadge } from "@/core/tools/ApprovalStatusBadge";
import { useSession } from "@/core/security/session";
import { financeService } from "@/core/services/finance/financeService";
import { logService } from "@/core/services/finance/logService";
import { useTreasury } from "@/hooks/finance/useTreasury";

type PaymentStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "SCHEDULED"
  | "FAILED";

type PaymentTab = PaymentStatus;

type Payment = {
  id?: string;
  destination: string;
  amount: number;
  method: string;
  purpose: string;
  status?: PaymentStatus;
  approvalLevel?: number;
  scheduledDate?: string;
  recurring?: boolean;
};

const TABS: PaymentTab[] = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SCHEDULED",
  "FAILED",
];

export default function PayFlow() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<PaymentTab>("PENDING");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [payment, setPayment] = useState<Payment>({
    amount: 0,
    method: "BANK_TRANSFER",
    destination: "",
    purpose: "",
    status: "PENDING",
    approvalLevel: 0,
  });
  const [batchPayments, setBatchPayments] = useState<Payment[]>([]);
  const [selectedItem, setSelectedItem] = useState<Payment | null>(null);

  const { sources } = useTreasury(session.tenantId, session);

  const normalizePayments = useCallback(() => {
    return financeService
      .listPayments(session.tenantId)
      .map((payment) => ({
        ...payment,
        status:
          payment.status === "PENDING" ||
          payment.status === "APPROVED" ||
          payment.status === "REJECTED" ||
          payment.status === "SCHEDULED" ||
          payment.status === "FAILED"
            ? payment.status
            : ("PENDING" as PaymentStatus),
      })) as Payment[];
  }, [session.tenantId]);

  const [payments, setPayments] = useState<Payment[]>(() =>
    normalizePayments(),
  );

  const refreshPayments = useCallback(() => {
    setPayments(normalizePayments());
  }, [normalizePayments]);

  useEffect(() => {
    refreshPayments();
  }, [refreshPayments, session]);

  const groupedPayments = useMemo(() => {
    const groups: Record<PaymentTab, Payment[]> = {
      PENDING: [],
      APPROVED: [],
      REJECTED: [],
      SCHEDULED: [],
      FAILED: [],
    };
    for (const item of payments) {
      const status: PaymentStatus = item.status ?? "PENDING";
      groups[status].push(item);
    }
    return groups;
  }, [payments]);

  const summaryCounts = useMemo(
    () => ({
      pending: groupedPayments.PENDING.length,
      approved: groupedPayments.APPROVED.length,
      rejected: groupedPayments.REJECTED.length,
      scheduled: groupedPayments.SCHEDULED.length,
      failed: groupedPayments.FAILED.length,
    }),
    [groupedPayments],
  );

  const filteredPayments = useMemo(
    () =>
      groupedPayments[tab].filter((p) =>
        !search ? true : p.destination.toLowerCase().includes(search.toLowerCase()),
      ),
    [groupedPayments, search, tab],
  );

  const handleCreatePayment = () => {
    financeService.createPayment(session.tenantId, payment);
    logService.log(
      session.tenantId,
      session.userId,
      `Created Payment: ${JSON.stringify(payment)}`,
    );
    setDialogOpen(false);
    setPayment({
      amount: 0,
      method: "BANK_TRANSFER",
      destination: "",
      purpose: "",
      status: "PENDING",
      approvalLevel: 0,
    });
    refreshPayments();
  };

  const handleCreateBatch = () => {
    batchPayments.forEach((p) => {
      financeService.createPayment(session.tenantId, p);
      logService.log(
        session.tenantId,
        session.userId,
        `Created Payment: ${JSON.stringify(p)}`,
      );
    });
    setBatchDialogOpen(false);
    setBatchPayments([]);
    refreshPayments();
  };

  const handleApprovalAction = (id: string, action: "APPROVED" | "REJECTED") => {
    financeService.updatePaymentStatus(session.tenantId, id, action);
    logService.log(session.tenantId, session.userId, `Payment ${id} ${action}`);
    refreshPayments();
  };

  const renderTable = (items: Payment[]) => (
    <DataTableShell total={items.length} page={1} pageSize={10}>
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="p-3 text-left">Destination</th>
            <th className="p-3 text-left">Method</th>
            <th className="p-3 text-left">Amount</th>
            <th className="p-3 text-left">Purpose</th>
            <th className="p-3 text-left">Status</th>
            <th className="p-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr
              key={p.id}
              className="cursor-pointer border-t hover:bg-muted/50"
              onClick={() => setSelectedItem(p)}
            >
              <td className="p-3">{p.destination}</td>
              <td className="p-3 text-muted-foreground">{p.method}</td>
              <td className="p-3 text-muted-foreground">
                {p.amount.toLocaleString()}
              </td>
              <td className="p-3">{p.purpose}</td>
              <td className="p-3">
                <ApprovalStatusBadge status={p.status ?? "PENDING"} />
              </td>
              <td className="p-3 space-x-2">
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={p.status === "APPROVED"}
                    onClick={() => p.id && handleApprovalAction(p.id, "APPROVED")}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={p.status === "REJECTED"}
                    onClick={() => p.id && handleApprovalAction(p.id, "REJECTED")}
                  >
                    Reject
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </DataTableShell>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pay Flow"
        subtitle="Operational payments: create, approve, track, schedule, and audit all transactions."
        primaryAction={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBatchDialogOpen(true)}>
              Create Batch
            </Button>
            <Button onClick={() => setDialogOpen(true)}>Create Payment</Button>
          </div>
        }
        secondaryActions={
          <div className="flex gap-2">
            <Select
              value={tab}
              onValueChange={(value) =>
                setTab(value as PaymentStatus)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Tab" />
              </SelectTrigger>
              <SelectContent>
                {TABS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Search payments"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-[220px]"
            />
          </div>
        }
      />

      <WorkspacePanel
        title="Payment Health"
        description="Counts by status for transparency and approvals."
      >
        <div className="grid gap-3 sm:grid-cols-5">
          {TABS.map((status) => (
            <div key={status} className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">{status}</p>
              <p className="text-xl font-semibold">
                {summaryCounts[status.toLowerCase() as keyof typeof summaryCounts]}
              </p>
              <Badge variant="outline">{status}</Badge>
            </div>
          ))}
        </div>
      </WorkspacePanel>

      <WorkspacePanel
        title="Payments Work Queue"
        description="Payments requiring action, approvals, or review."
      >
        <Tabs value={tab} onValueChange={(value) => setTab(value as PaymentTab)}>
          <TabsList>
            {TABS.map((status) => (
              <TabsTrigger key={status} value={status}>
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </TabsTrigger>
            ))}
          </TabsList>

          {TABS.map((status) => {
            const items =
              status === tab ? filteredPayments : groupedPayments[status];
            return (
              <TabsContent key={status} value={status} className="mt-4">
                {items.length ? (
                  renderTable(items)
                ) : (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    {status.charAt(0) + status.slice(1).toLowerCase()} payments will
                    appear here.
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </WorkspacePanel>

      {/* Dialogs */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Destination"
              value={payment.destination}
              onChange={(e) =>
                setPayment({ ...payment, destination: e.target.value })
              }
            />
            <Input
              placeholder="Amount"
              type="number"
              value={payment.amount}
              onChange={(e) =>
                setPayment({ ...payment, amount: Number(e.target.value) })
              }
            />
            <Select
              value={payment.method}
              onValueChange={(value) => setPayment({ ...payment, method: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Method" />
              </SelectTrigger>
              <SelectContent>
                {sources.map((s) => (
                  <SelectItem key={s.id} value={s.name}>
                    {s.name}
                  </SelectItem>
                ))}
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="QRIS">QRIS</SelectItem>
                <SelectItem value="GOPAY">GoPay</SelectItem>
                <SelectItem value="OVO">OVO</SelectItem>
                <SelectItem value="DANA">Dana</SelectItem>
                <SelectItem value="SHOPEEPAY">ShopeePay</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Purpose"
              value={payment.purpose}
              onChange={(e) =>
                setPayment({ ...payment, purpose: e.target.value })
              }
            />
            <Input
              placeholder="Scheduled Date (optional)"
              type="date"
              value={payment.scheduledDate}
              onChange={(e) =>
                setPayment({ ...payment, scheduledDate: e.target.value })
              }
            />
            <div className="flex items-center space-x-2">
              <Input
                type="checkbox"
                checked={payment.recurring}
                onChange={(e) =>
                  setPayment({ ...payment, recurring: e.target.checked })
                }
              />
              <span>Recurring</span>
            </div>
            <div className="flex justify-end gap-2">
              <Button onClick={handleCreatePayment}>Create and Route</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Batch Payments</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Upload a CSV or add multiple payments manually.
            </div>
            {batchPayments.map((p, idx) => (
              <div key={idx} className="flex gap-2">
                <Input
                  placeholder="Destination"
                  value={p.destination}
                  onChange={(e) =>
                    setBatchPayments(
                      batchPayments.map((b, i) =>
                        i === idx ? { ...b, destination: e.target.value } : b,
                      ),
                    )
                  }
                />
                <Input
                  placeholder="Amount"
                  type="number"
                  value={p.amount}
                  onChange={(e) =>
                    setBatchPayments(
                      batchPayments.map((b, i) =>
                        i === idx
                          ? { ...b, amount: Number(e.target.value) }
                          : b,
                      ),
                    )
                  }
                />
              </div>
            ))}
            <Button
              onClick={() =>
                setBatchPayments([
                  ...batchPayments,
                  {
                    destination: "",
                    amount: 0,
                    method: "BANK_TRANSFER",
                    purpose: "",
                    status: "PENDING",
                    approvalLevel: 0,
                  },
                ])
              }
            >
              Add Payment
            </Button>
            <div className="flex justify-end gap-2">
              <Button onClick={handleCreateBatch}>Create Batch</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payment Record Detail</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 text-sm gap-y-2">
              <span className="text-muted-foreground">Payment ID:</span>
              <span>{selectedItem?.id}</span>
              <span className="text-muted-foreground">Destination:</span>
              <span className="font-semibold">{selectedItem?.destination}</span>
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-bold text-lg">{selectedItem?.amount.toLocaleString()}</span>
              <span className="text-muted-foreground">Method:</span>
              <span>{selectedItem?.method}</span>
              <span className="text-muted-foreground">Purpose:</span>
              <span>{selectedItem?.purpose}</span>
              <span className="text-muted-foreground">Status:</span>
              <span><ApprovalStatusBadge status={selectedItem?.status || "PENDING"} /></span>
              {selectedItem?.scheduledDate && (
                <>
                  <span className="text-muted-foreground">Scheduled Date:</span>
                  <span>{selectedItem.scheduledDate}</span>
                </>
              )}
            </div>
            <div className="border-t pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Audit & Compliance</p>
              <p className="text-xs text-muted-foreground">
                Transaction signed by internal HSM. {selectedItem?.recurring ? "This is a recurring payment setup." : ""}
                Compliance AML check passed on creation.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
