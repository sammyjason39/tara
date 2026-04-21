import { PageShell } from "@/core/ui/PageShell";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { 
  Trees, 
  Beef, 
  Activity, 
  Thermometer, 
  Calendar,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkforceScheduler } from "@/core/ui/WorkforceScheduler";

import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

export default function FarmDesk() {
  return (
    <PageShell
      header={
        <PageHeader
          title="Farm & Livestock Ops"
          subtitle="Livestock monitoring, crop management, and environmental sensor feeds."
          primaryAction={
            <Button disabled title="Not available yet" className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-2" /> Log Activity
            </Button>
          }
        />
      }
    >
      <Tabs defaultValue="livestock" className="space-y-6">
        <TabsList className="bg-muted/50 border backdrop-blur-sm p-1">
          <TabsTrigger value="livestock" className="gap-2">
            <Beef className="h-4 w-4" /> Livestock
          </TabsTrigger>
          <TabsTrigger value="crops" className="gap-2">
            <Trees className="h-4 w-4" /> Crops
          </TabsTrigger>
          <TabsTrigger value="iot" className="gap-2">
            <Activity className="h-4 w-4" /> IoT Sensors
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-2 font-bold text-primary">
            <Calendar className="h-4 w-4" /> Field Schedule
          </TabsTrigger>
        </TabsList>

        <TabsContent value="livestock">
          <WorkspacePanel title="Livestock Inventory">
            <DataTableShell
              emptyState={<div className="p-8 text-center text-muted-foreground">No livestock records found.</div>}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tag ID</TableHead>
                    <TableHead>Breed</TableHead>
                    <TableHead>Health Status</TableHead>
                    <TableHead>Paddock / Pen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No data available.
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </DataTableShell>
          </WorkspacePanel>
        </TabsContent>

        <TabsContent value="iot">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <WorkspacePanel title="Barn Temp">
                  <div className="flex items-center justify-between">
                      <Thermometer className="h-8 w-8 text-orange-500" />
                      <span className="text-3xl font-black">24.5°C</span>
                  </div>
              </WorkspacePanel>
              <WorkspacePanel title="Soil Moisture">
                  <div className="flex items-center justify-between">
                      <Activity className="h-8 w-8 text-blue-500" />
                      <span className="text-3xl font-black">68%</span>
                  </div>
              </WorkspacePanel>
              {/* More sensor cards */}
           </div>
        </TabsContent>

        <TabsContent value="schedule">
          <WorkforceScheduler departmentId="farming-ops" title="Field Staff Schedule" />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
