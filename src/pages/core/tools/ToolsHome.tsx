import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { useSession } from "@/core/security/session";
import { listTools } from "@/core/tools/toolRegistry";
import DepartmentWorkspaceLayout from "@/components/layouts/DepartmentWorkspaceLayout";
import { Briefcase, FolderOpen, FileText, Layout, Table as TableIcon, Calculator, Download, Activity } from "lucide-react";

const SECTIONS = [
  {
    title: "WORK SUITE",
    items: [
      { id: 'tools', icon: Briefcase, label: "All Tools", to: "/core/tools" },
      { id: 'explorer', icon: FolderOpen, label: "Explorer", to: "/core/tools/explorer" },
    ]
  },
  {
    title: "OFFICE",
    items: [
      { id: 'docs', icon: FileText, label: "Documents", to: "/core/tools/docs" },
      { id: 'sheets', icon: TableIcon, label: "Spreadsheets", to: "/core/tools/sheets" },
      { id: 'slides', icon: Layout, label: "Presentations", to: "/core/tools/slides" },
    ]
  }
];

export default function ToolsHome() {
  const session = useSession();
  const tools = listTools(session.tenant_id);

  const mainContent = (
    <div className="space-y-6 p-6">
      <WorkspacePanel title="Available Tools" description="Platform-wide productivity suite.">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="p-6 hover:shadow-lg transition-all border-slate-100 group">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <FolderOpen className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Explorer</h3>
                <p className="text-xs text-muted-foreground">Department file manager</p>
              </div>
            </div>
            <Button asChild variant="outline" className="w-full rounded-xl" size="sm">
              <Link to="/core/tools/explorer">Open Explorer</Link>
            </Button>
          </Card>

          {(Array.isArray(tools) ? tools : []).map((tool) => {
            const route =
              tool.category === "documents"
                ? "docs"
                : tool.category === "spreadsheets"
                  ? "sheets"
                  : tool.category === "presentations"
                    ? "slides"
                    : tool.category === "calculators"
                      ? "calculators"
                      : "exports";
            
            const Icon = tool.category === "documents" ? FileText :
                         tool.category === "spreadsheets" ? TableIcon :
                         tool.category === "presentations" ? Layout :
                         tool.category === "calculators" ? Calculator : Download;

            return (
              <Card key={tool.id} className="p-6 hover:shadow-lg transition-all border-slate-100 group">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">{tool.name}</h3>
                    <p className="text-xs text-muted-foreground capitalize">{tool.category}</p>
                  </div>
                </div>
                <Button asChild variant="outline" className="w-full rounded-xl" size="sm">
                  <Link to={`/core/tools/${route}`}>Open Tool</Link>
                </Button>
              </Card>
            );
          })}
        </div>
      </WorkspacePanel>
    </div>
  );

  return (
    <DepartmentWorkspaceLayout
      title="WorkSuite"
      subtitle="Shared office tools for documents, spreadsheets, and exports."
      headerIcon={Briefcase}
      accentColor="indigo"
      engineName="PRODUCTIVITY_ENGINE"
      pulseLabel="Tools Pulse"
      pulseIcon={Activity}
      sections={SECTIONS}
      routeLabels={{}}
      basePath="/core/tools"
    >
      {mainContent}
    </DepartmentWorkspaceLayout>
  );
}

import { Card } from "@/components/ui/card";
