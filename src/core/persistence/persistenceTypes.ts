import type { WorkflowRepository } from "@/core/tools/workflows/workflowRepository";
import type { StaffRepository } from "@/core/hr/staffRepository";
import type { DocumentRepository } from "@/core/documents/documentRepository";

export type RepositoryKey = "workflow" | "staff" | "document";

export type RepositoryMap = {
  workflow: WorkflowRepository;
  staff: StaffRepository;
  document: DocumentRepository;
};
