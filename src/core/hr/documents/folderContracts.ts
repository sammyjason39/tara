export type DocumentFolder = {
  id: string;
  tenantId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export function listDefaultHrFolders(tenantId: string): DocumentFolder[] {
  const now = new Date().toISOString();
  return [
    { id: "folder-contracts", tenantId, name: "Contracts", createdAt: now, updatedAt: now },
    { id: "folder-visas", tenantId, name: "Visas", createdAt: now, updatedAt: now },
    { id: "folder-payroll", tenantId, name: "Payroll Exports", createdAt: now, updatedAt: now },
    { id: "folder-kpi", tenantId, name: "KPI Reports", createdAt: now, updatedAt: now },
  ];
}
