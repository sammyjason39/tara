import type { DocumentRecord } from "./documentTypes";
import type { DocumentRepository } from "./documentRepository";

const STORAGE_KEY = "core.documents.repo";

const read = (): DocumentRecord[] => {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as DocumentRecord[]) : [];
};

const write = (items: DocumentRecord[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

export const mockDocumentRepo: DocumentRepository = {
  listDocuments(tenantId) {
    return read().filter((doc) => doc.tenantId === tenantId);
  },
  getDocument(tenantId, documentId) {
    return read().find((doc) => doc.tenantId === tenantId && doc.id === documentId);
  },
  createDocument(tenantId, payload) {
    const next = [...read(), payload];
    write(next);
    return payload;
  },
  updateDocument(tenantId, payload) {
    const next = read().map((doc) =>
      doc.tenantId === tenantId && doc.id === payload.id ? payload : doc,
    );
    write(next);
    return payload;
  },
};
