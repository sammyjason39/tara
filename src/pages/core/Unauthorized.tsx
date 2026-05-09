import { Button } from "@/components/ui/button";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { ShieldAlert, Activity, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import DepartmentWorkspaceLayout from "@/components/layouts/DepartmentWorkspaceLayout";

export default function UnauthorizedPage() {
  return (
    <DepartmentWorkspaceLayout
      title="Access Restricted"
      subtitle="You do not have permission to view this workspace."
      headerIcon={ShieldAlert}
      accentColor="rose"
      engineName="SECURITY_ENGINE"
      pulseLabel="Security Pulse"
      pulseIcon={Activity}
      sections={[]}
      routeLabels={{}}
      basePath="/core/unauthorized"
      headerActions={
        <Button asChild className="rounded-xl h-10 px-6 font-black text-[10px] uppercase tracking-widest bg-slate-900 text-white">
          <Link to="/core">
            <ArrowLeft className="h-3 w-3 mr-2" /> Return to dashboard
          </Link>
        </Button>
      }
    >
      <div className="p-6">
        <WorkspacePanel>
          <div className="flex flex-col items-center justify-center gap-6 rounded-[2rem] border border-dashed p-20 text-center bg-rose-500/5 border-rose-500/20">
            <div className="h-16 w-16 rounded-full bg-rose-500/10 flex items-center justify-center shadow-inner shadow-rose-500/10">
              <ShieldAlert className="h-8 w-8 text-rose-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black uppercase tracking-[0.2em] text-rose-600 italic">
                Permission Required
              </h3>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest max-w-md mx-auto">
                Unauthorized access attempt logged. Contact your administrator if you believe this is a mistake.
              </p>
            </div>
            <div className="pt-4">
              <Button asChild variant="outline" className="rounded-xl h-11 px-8 font-black text-[10px] uppercase tracking-widest border-rose-200 text-rose-600 hover:bg-rose-50">
                <Link to="/core">Acknowledge & Exit</Link>
              </Button>
            </div>
          </div>
        </WorkspacePanel>
      </div>
    </DepartmentWorkspaceLayout>
  );
}
