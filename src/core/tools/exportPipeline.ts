import { logAction } from "@/core/logging/audit";

type ExportPdfInput = {
  tenantId: string;
  actor: { userId: string; role: string; departmentId?: string };
  filename: string;
  content: string;
  source: "docs" | "sheets" | "slides";
};

export function exportPdf(input: ExportPdfInput): Blob {
  logAction({
    actor: input.actor,
    tenantId: input.tenantId,
    entityType: "export_pdf",
    actionType: "create",
    metadata: { source: input.source, filename: input.filename },
  });
  return new Blob([input.content], { type: "application/pdf" });
}
