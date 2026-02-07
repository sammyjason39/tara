import type { RepositoryKey, RepositoryMap } from "./persistenceTypes";
import { mockWorkflowRepo } from "@/core/tools/workflows/mockWorkflowRepo";
import { mockStaffRepo } from "@/core/hr/mockStaffRepo";
import { mockDocumentRepo } from "@/core/documents/mockDocumentRepo";

const registry: Partial<RepositoryMap> = {};

export function registerRepo<K extends RepositoryKey>(
  key: K,
  repo: RepositoryMap[K],
): void {
  registry[key] = repo;
}

export function getRepo<K extends RepositoryKey>(key: K): RepositoryMap[K] {
  const repo = registry[key];
  if (!repo) {
    throw new Error(`Repository not registered: ${key}`);
  }
  return repo;
}

export function registerDefaultRepos(): void {
  if (!registry.workflow) registerRepo("workflow", mockWorkflowRepo);
  if (!registry.staff) registerRepo("staff", mockStaffRepo);
  if (!registry.document) registerRepo("document", mockDocumentRepo);
}
