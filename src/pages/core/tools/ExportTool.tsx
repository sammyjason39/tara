import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/core/ui/PageHeader";
import { PageShell } from "@/core/ui/PageShell";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";

const exportTargets = [
  { id: "staff", label: "Staff Directory" },
  { id: "payroll", label: "Payroll Runs" },
  { id: "attendance", label: "Attendance Logs" },
  { id: "contracts", label: "Legal Contracts" },
];

export default function ExportTool() {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const exportJson = () => {
    const payload = { selected, generatedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "exports.json";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportCsv = () => {
    const csv = ["dataset", ...selected].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "exports.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <PageShell
      header={
        <PageHeader
          title="Exports"
          subtitle="Generate CSV or JSON export packages."
          primaryAction={<Button onClick={exportCsv}>Export CSV</Button>}
          secondaryActions={<Button variant="outline" onClick={exportJson}>Export JSON</Button>}
        />
      }
    >
      <WorkspacePanel title="Select datasets" description="Choose data to include.">
        <div className="space-y-3">
          {exportTargets.map((target) => (
            <div key={target.id} className="flex items-center gap-3">
              <Checkbox
                checked={selected.includes(target.id)}
                onCheckedChange={() => toggle(target.id)}
              />
              <span className="text-sm">{target.label}</span>
            </div>
          ))}
        </div>
      </WorkspacePanel>
    </PageShell>
  );
}
