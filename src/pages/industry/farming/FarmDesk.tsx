import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Trees,
  Beef,
  Activity,
  Thermometer,
  Calendar,
  Plus,
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
import { safeText } from "@/lib/format";

const MODULE_CODE = "farming";

interface Livestock {
  id: string;
  tagId?: string;
  breed?: string;
  healthStatus?: string;
  location?: string;
}

interface FarmSensor {
  id: string;
  label?: string;
  reading?: string;
}

export default function FarmDesk() {
  const navigate = useNavigate();
  const session = useSession();
  const { isModuleActive, loading: moduleLoading } = useModuleActivation();
  const active = isModuleActive(MODULE_CODE);

  const livestockQuery = useQuery<Livestock[]>({
    queryKey: ["farming", "livestock", session.tenant_id],
    queryFn: () =>
      apiRequest<Livestock[]>("/farming/livestock", "GET", session),
    enabled: active,
  });

  const sensorsQuery = useQuery<FarmSensor[]>({
    queryKey: ["farming", "sensors", session.tenant_id],
    queryFn: () => apiRequest<FarmSensor[]>("/farming/sensors", "GET", session),
    enabled: active,
  });

  const logActivity = useMutation({
    mutationFn: () =>
      apiRequest("/farming/activity-log", "POST", session, {
        type: "manual",
        note: "Sector activity logged from Farm Desk",
      }),
    onSuccess: () => {
      toast.success("Activity logged", {
        description: "The sector activity has been recorded.",
      });
      void livestockQuery.refetch();
    },
    onError: () => {
      toast.error("Could not log activity. Try again.");
    },
  });

  return (
    <PageShell
      header={
        <PageHeader
          title="Farm & Livestock Ops"
          subtitle="Livestock monitoring, crop management, and environmental sensor feeds."
          primaryAction={
            <Button
              onClick={() => logActivity.mutate()}
              disabled={!active || logActivity.isPending}
              className="bg-success hover:bg-success/90 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              {logActivity.isPending ? "Logging..." : "Log Activity"}
            </Button>
          }
        />
      }
    >
      {moduleLoading ? (
        <LoadingSkeleton variant="cards" label="Checking module availability" />
      ) : !active ? (
        <ModuleInactiveState
          moduleName="Farm & Livestock"
          onManageModules={() => navigate("/core/license")}
        />
      ) : (
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
              <QueryBoundary
                query={livestockQuery}
                loading={<LoadingSkeleton variant="rows" />}
                empty={
                  <EmptyState
                    title="No livestock records"
                    description="No livestock records were found for this tenant scope."
                    icon={Beef}
                  />
                }
              >
                {(livestock) => (
                  <DataTableShell total={livestock.length}>
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
                        {livestock.map((animal) => (
                          <TableRow key={animal.id}>
                            <TableCell className="font-medium">
                              {safeText(animal.tagId)}
                            </TableCell>
                            <TableCell>{safeText(animal.breed)}</TableCell>
                            <TableCell>{safeText(animal.healthStatus)}</TableCell>
                            <TableCell>{safeText(animal.location)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </DataTableShell>
                )}
              </QueryBoundary>
            </WorkspacePanel>
          </TabsContent>

          <TabsContent value="crops">
            <WorkspacePanel title="Crop Management">
              <EmptyState
                title="No crop cycles"
                description="Crop cycles and field plans for this tenant will appear here."
                icon={Trees}
              />
            </WorkspacePanel>
          </TabsContent>

          <TabsContent value="iot">
            <QueryBoundary
              query={sensorsQuery}
              loading={<LoadingSkeleton variant="cards" count={4} />}
              empty={
                <EmptyState
                  title="No sensor feeds"
                  description="No environmental sensors are reporting for this tenant yet."
                  icon={Activity}
                />
              }
            >
              {(sensors) => (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {sensors.map((sensor) => (
                    <GlassCard key={sensor.id}>
                      <GlassCardContent className="p-5">
                        <p className="text-xs text-muted-foreground uppercase font-bold mb-3">
                          {safeText(sensor.label)}
                        </p>
                        <div className="flex items-center justify-between">
                          <Thermometer className="h-8 w-8 text-warning" />
                          <span className="text-3xl font-black">
                            {safeText(sensor.reading)}
                          </span>
                        </div>
                      </GlassCardContent>
                    </GlassCard>
                  ))}
                </div>
              )}
            </QueryBoundary>
          </TabsContent>

          <TabsContent value="schedule">
            <WorkforceScheduler departmentId="farming-ops" title="Field Staff Schedule" />
          </TabsContent>
        </Tabs>
      )}
    </PageShell>
  );
}
