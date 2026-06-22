import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Users,
  Calendar,
  FileText,
  CreditCard,
  RefreshCw,
} from "lucide-react";

import { PageShell } from "@/core/ui/PageShell";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTableShell } from "@/core/tools/DataTableShell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { WorkforceScheduler } from "@/core/ui/WorkforceScheduler";
import {
  GlassCard,
  GlassCardContent,
} from "@/components/shared/GlassCard";
import { QueryBoundary } from "@/components/shared/QueryBoundary";
import { EmptyState, LoadingSkeleton } from "@/components/shared/AsyncState";
import { ModuleInactiveState } from "@/pages/industry/ModuleInactiveState";
import { useModuleActivation } from "@/hooks/useModuleActivation";
import { useSession } from "@/core/security/session";
import { apiRequest } from "@/core/api/apiClient";
import { formatCurrency, formatDate, formatNumber, safeText } from "@/lib/format";

const MODULE_CODE = "clinic";

interface ClinicPatient {
  id: string;
  fullName?: string;
  mrn?: string;
  status?: string;
  lastVisit?: string | number | Date | null;
}

interface ClinicInvoice {
  id: string;
  invoiceNo?: string;
  patient?: string;
  amount?: number | null;
  status?: string;
}

interface ClinicBillingSummary {
  outstanding?: number | null;
  pendingClaims?: number | null;
  dayRevenue?: number | null;
  invoices?: ClinicInvoice[];
}

export default function ClinicDesk() {
  const navigate = useNavigate();
  const session = useSession();
  const { isModuleActive, loading: moduleLoading } = useModuleActivation();
  const active = isModuleActive(MODULE_CODE);

  const patientsQuery = useQuery<ClinicPatient[]>({
    queryKey: ["clinic", "patients", session.tenant_id],
    queryFn: () =>
      apiRequest<ClinicPatient[]>("/clinic/patients", "GET", session),
    enabled: active,
  });

  const billingQuery = useQuery<ClinicBillingSummary>({
    queryKey: ["clinic", "billing", session.tenant_id],
    queryFn: () =>
      apiRequest<ClinicBillingSummary>("/clinic/billing/summary", "GET", session),
    enabled: active,
  });

  const handleSync = async () => {
    const toastId = toast.loading("Syncing clinic records...");
    try {
      await Promise.all([patientsQuery.refetch(), billingQuery.refetch()]);
      toast.success("Clinic records synchronized.", { id: toastId });
    } catch {
      toast.error("Could not sync clinic records. Try again.", { id: toastId });
    }
  };

  const syncing = patientsQuery.isFetching || billingQuery.isFetching;

  return (
    <PageShell
      header={
        <PageHeader
          title="Clinic Operations"
          subtitle="Patient management, clinical records, and medical billing."
          primaryAction={
            <Button
              onClick={handleSync}
              disabled={!active || syncing}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`}
              />
              {syncing ? "Syncing..." : "Sync Records"}
            </Button>
          }
        />
      }
    >
      {moduleLoading ? (
        <LoadingSkeleton variant="cards" label="Checking module availability" />
      ) : !active ? (
        <ModuleInactiveState
          moduleName="Clinic Operations"
          onManageModules={() => navigate("/core/license")}
        />
      ) : (
        <Tabs defaultValue="patients" className="space-y-6">
          <TabsList className="bg-muted/50 border backdrop-blur-sm p-1">
            <TabsTrigger value="patients" className="gap-2">
              <Users className="h-4 w-4" /> Patients
            </TabsTrigger>
            <TabsTrigger value="appointments" className="gap-2">
              <Calendar className="h-4 w-4" /> Appointments
            </TabsTrigger>
            <TabsTrigger value="records" className="gap-2">
              <FileText className="h-4 w-4" /> Medical Records
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-2">
              <CreditCard className="h-4 w-4" /> Billing
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-2 font-bold text-primary">
              <Calendar className="h-4 w-4" /> Staff Schedule
            </TabsTrigger>
          </TabsList>

          <TabsContent value="patients">
            <WorkspacePanel title="Patient Directory">
              <QueryBoundary
                query={patientsQuery}
                loading={<LoadingSkeleton variant="rows" />}
                empty={
                  <EmptyState
                    title="No patients yet"
                    description="No patients are registered in this clinic for the current tenant scope."
                    icon={Users}
                  />
                }
              >
                {(patients) => (
                  <DataTableShell total={patients.length}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Patient Name</TableHead>
                          <TableHead>MRN</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Last Visit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {patients.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">
                              {safeText(p.fullName)}
                            </TableCell>
                            <TableCell>{safeText(p.mrn)}</TableCell>
                            <TableCell>{safeText(p.status)}</TableCell>
                            <TableCell>{formatDate(p.lastVisit)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </DataTableShell>
                )}
              </QueryBoundary>
            </WorkspacePanel>
          </TabsContent>

          <TabsContent value="appointments">
            <WorkspacePanel title="Appointments">
              <EmptyState
                title="No appointments scheduled"
                description="Clinical appointments for this tenant will appear here once booked."
                icon={Calendar}
              />
            </WorkspacePanel>
          </TabsContent>

          <TabsContent value="records">
            <WorkspacePanel title="Medical Records">
              <EmptyState
                title="No medical records"
                description="Patient clinical records for this tenant will appear here."
                icon={FileText}
              />
            </WorkspacePanel>
          </TabsContent>

          <TabsContent value="schedule">
            <WorkforceScheduler departmentId="clinic-ops" title="Clinic Staff Schedule" />
          </TabsContent>

          <TabsContent value="billing">
            <WorkspacePanel title="Medical Revenue Stream">
              <QueryBoundary
                query={billingQuery}
                isEmpty={() => false}
                loading={<LoadingSkeleton variant="cards" count={3} />}
              >
                {(summary) => (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <GlassCard>
                        <GlassCardContent className="p-4">
                          <p className="text-xs text-muted-foreground uppercase font-bold">
                            Outstanding
                          </p>
                          <p className="text-2xl font-black italic">
                            {formatCurrency(summary.outstanding ?? 0)}
                          </p>
                        </GlassCardContent>
                      </GlassCard>
                      <GlassCard>
                        <GlassCardContent className="p-4">
                          <p className="text-xs text-muted-foreground uppercase font-bold">
                            Insurance Claims
                          </p>
                          <p className="text-2xl font-black italic">
                            {formatNumber(summary.pendingClaims ?? 0, {
                              maximumFractionDigits: 0,
                            })}{" "}
                            Pending
                          </p>
                        </GlassCardContent>
                      </GlassCard>
                      <GlassCard>
                        <GlassCardContent className="p-4">
                          <p className="text-xs text-muted-foreground uppercase font-bold">
                            Day Revenue
                          </p>
                          <p className="text-2xl font-black italic text-success">
                            {formatCurrency(summary.dayRevenue ?? 0)}
                          </p>
                        </GlassCardContent>
                      </GlassCard>
                    </div>

                    <DataTableShell
                      total={summary.invoices?.length ?? 0}
                      emptyState={
                        <EmptyState
                          title="No invoices"
                          description="No medical invoices have been issued for this tenant yet."
                          icon={CreditCard}
                        />
                      }
                    >
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Patient</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(summary.invoices ?? []).map((inv) => (
                            <TableRow key={inv.id}>
                              <TableCell className="font-medium">
                                {safeText(inv.invoiceNo)}
                              </TableCell>
                              <TableCell>{safeText(inv.patient)}</TableCell>
                              <TableCell>{formatCurrency(inv.amount)}</TableCell>
                              <TableCell>{safeText(inv.status)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </DataTableShell>
                  </>
                )}
              </QueryBoundary>
            </WorkspacePanel>
          </TabsContent>
        </Tabs>
      )}
    </PageShell>
  );
}
