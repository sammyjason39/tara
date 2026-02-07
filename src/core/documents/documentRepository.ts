import type { DocumentRecord } from "./documentTypes";

export interface DocumentRepository {
  listDocuments: (tenantId: string) => DocumentRecord[];
  getDocument: (tenantId: string, documentId: string) => DocumentRecord | undefined;
  createDocument: (tenantId: string, payload: DocumentRecord) => DocumentRecord;
  updateDocument: (tenantId: string, payload: DocumentRecord) => DocumentRecord;
}
