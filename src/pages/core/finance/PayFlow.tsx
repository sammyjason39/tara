// src/pages/core/finance/PayFlow.tsx
import { useMemo, useState } from "react";
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
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { ApprovalStatusBadge } from "@/core/tools/ApprovalStatusBadge";
import { useSession } from "@/core/security/session";
import { financeService } from "@/core/services/finance/financeService";
import { workflowService } from "@/core/services/hr/workflowService";
import { logService } from "@/core/services/finance/logService";
import { useTreasury } from "@/hooks/finance/useTreasury";

type Payment = {
  id?: string;
  destination: string;
  amount: number;
  method: string;
  purpose: string;
  status?: "PENDING" | "APPROVED" | "REJECTED" | "SCHEDULED" | "FAILED";
  approvalLevel?: number;
  scheduledDate?: string;
  recurring?: boolean;
};

export default function PayFlow() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<
    "pending" | "approved" | "rejected" | "scheduled" | "failed"
  >("pending");
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

  const { sources } = useTreasury(session.tenantId, session);

  // Fetch payments from mock service
  const payments = useMemo(
    () => financeService.listPayments(session.tenantId),
    [session],
  );

  // Filtered payments by search and tab
  const filteredPayments = payments.filter(
    (p) =>
      (!search || p.destination.toLowerCase().includes(search.toLowerCase())) &&
      (tab === "pending"
        ? p.status === "PENDING"
        : tab === "approved"
          ? p.status === "APPROVED"
          : tab === "rejected"
            ? p.status === "REJECTED"
            : tab === "scheduled"
              ? p.status === "SCHEDULED"
              : tab === "failed"
                ? p.status === "FAILED"
                : true),
  );

  // Create single payment with workflow & logging
  const handleCreatePayment = () => {
    financeService.createPayment(session.tenantId, payment);
    workflowService.routePayment(session.tenantId, payment); // Mock workflow route
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
  };

  // Batch payment creation
  const handleCreateBatch = () => {
    batchPayments.forEach((p) => {
      financeService.createPayment(session.tenantId, p);
      workflowService.routePayment(session.tenantId, p);
      logService.log(
        session.tenantId,
        session.userId,
        `Created Payment: ${JSON.stringify(p)}`,
      );
    });
    setBatchDialogOpen(false);
    setBatchPayments([]);
  };

  // Approve / Reject inline
  const handleApprovalAction = (
    id: string,
    action: "APPROVED" | "REJECTED",
  ) => {
    financeService.updatePaymentStatus(session.tenantId, id, action);
    logService.log(session.tenantId, session.userId, `Payment ${id} ${action}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="PayFlow"
        subtitle="Operational payments: create, approve, track, schedule, and audit all transactions."
        primaryAction={
          <Button onClick={() => setDialogOpen(true)}>New Payment</Button>
        }
        secondaryActions={
          <Input
            placeholder="Search payments"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[220px]"
          />
        }
      />

      <WorkspacePanel
        title="Payments WorkQueue"
        description="Payments requiring action, approvals, or review."
      >
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="failed">Failed</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            <DataTableShell
              total={filteredPayments.length}
              page={1}
              pageSize={10}
            >
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3 text-left">Destination</th>
                    <th className="p-3 text-left">Method</th>
                    <th className="p-3 text-left">Amount</th>
                    <th className="p-3 text-left">Purpose</th>
                    <th className="p-3 text-left">Approval Level</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="p-3">{p.destination}</td>
                      <td className="p-3 text-muted-foreground">{p.method}</td>
                      <td className="p-3 text-muted-foreground">
                        {p.amount.toLocaleString()}
                      </td>
                      <td className="p-3">{p.purpose}</td>
                      <td className="p-3">{p.approvalLevel}</td>
                      <td className="p-3">
                        <ApprovalStatusBadge status={p.status!} />
                      </td>
                      <td className="p-3 space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleApprovalAction(p.id!, "APPROVED")
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            handleApprovalAction(p.id!, "REJECTED")
                          }
                        >
                          Reject
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataTableShell>
          </TabsContent>

          {/* Other tabs: approved, rejected, scheduled, failed */}
          {["approved", "rejected", "scheduled", "failed"].map((t) => (
            <TabsContent key={t} value={t} className="mt-4">
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                {t.charAt(0).toUpperCase() + t.slice(1)} payments will appear
                here. Integration hooks ready.
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </WorkspacePanel>

      {/* Dialog: New Payment */}
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
              onValueChange={(v) => setPayment({ ...payment, method: v })}
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
              />{" "}
              <span>Recurring</span>
            </div>
            <div className="flex justify-end gap-2">
              <Button onClick={handleCreatePayment}>Submit & Route</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Batch Payment (mock) */}
      <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Batch Payments</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Upload CSV or add multiple payments manually.
            </div>
            {/* Mock table for batch payments */}
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
              <Button onClick={handleCreateBatch}>Submit Batch</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
