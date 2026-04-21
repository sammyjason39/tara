import { PageShell } from "@/core/ui/PageShell";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { 
  Stethoscope, 
  Users, 
  Calendar, 
  FileText, 
  CreditCard,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkforceScheduler } from "@/core/ui/WorkforceScheduler";

export default function ClinicDesk() {
  return (
    <PageShell
      header={
        <PageHeader
          title="Clinic Operations"
          subtitle="Patient management, clinical records, and medical billing."
          primaryAction={
            <Button disabled title="Not available yet" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" /> New Patient
            </Button>
          }
        />
      }
    >
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
            <DataTableShell
              columns={[
                { key: "fullName", label: "Patient Name" },
                { key: "mrn", label: "MRN" },
                { key: "status", label: "Status" },
                { key: "lastVisit", label: "Last Visit" },
              ]}
              data={[]}
              emptyMessage="No patients registered in this clinic."
            />
          </WorkspacePanel>
        </TabsContent>

        <TabsContent value="schedule">
          <WorkforceScheduler departmentId="clinic-ops" title="Clinic Staff Schedule" />
        </TabsContent>

        <TabsContent value="billing">
          <WorkspacePanel title="Medical Revenue Stream">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-muted/20 border rounded-xl">
                    <p className="text-xs text-muted-foreground uppercase font-bold">Outstanding</p>
                    <p className="text-2xl font-black italic">$0.00</p>
                </div>
                <div className="p-4 bg-muted/20 border rounded-xl">
                    <p className="text-xs text-muted-foreground uppercase font-bold">Insurance Claims</p>
                    <p className="text-2xl font-black italic">0 Pending</p>
                </div>
                <div className="p-4 bg-muted/20 border rounded-xl">
                    <p className="text-xs text-muted-foreground uppercase font-bold">Day Revenue</p>
                    <p className="text-2xl font-black italic text-emerald-500">$0.00</p>
                </div>
             </div>
             <DataTableShell
              columns={[
                { key: "invoiceNo", label: "Invoice #" },
                { key: "patient", label: "Patient" },
                { key: "amount", label: "Amount" },
                { key: "status", label: "Status" },
              ]}
              data={[]}
            />
          </WorkspacePanel>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
