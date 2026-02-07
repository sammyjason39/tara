import type { DocumentRecord, DocumentType } from "./documentTypes";
import { getRepo } from "@/core/persistence/repositoryRegistry";

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `doc-${Date.now()}-${Math.random().toString(16).slice(2)}`;

type CreateDocumentInput = {
  tenantId: string;
  type: DocumentType;
  title: string;
  ownerId?: string;
  metadata?: Record<string, string>;
};

export function listDocuments(tenantId: string): DocumentRecord[] {
  return getRepo("document").listDocuments(tenantId);
}

export function createDocument(input: CreateDocumentInput): DocumentRecord {
  const now = new Date().toISOString();
  const record: DocumentRecord = {
    id: createId(),
    tenantId: input.tenantId,
    type: input.type,
    title: input.title,
    status: "draft",
    createdAt: now,
    updatedAt: now,
    ownerId: input.ownerId,
    metadata: input.metadata,
  };
  return getRepo("document").createDocument(input.tenantId, record);
}

export function updateDocument(
  tenantId: string,
  documentId: string,
  updates: Partial<DocumentRecord>,
): DocumentRecord | undefined {
  const repo = getRepo("document");
  const current = repo.getDocument(tenantId, documentId);
  if (!current) return undefined;
  const next = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  return repo.updateDocument(tenantId, next);
}
