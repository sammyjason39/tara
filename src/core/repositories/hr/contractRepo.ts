import type { Contract } from "@/core/types/hr/contract";
import { ensureSeed, nextId, saveToStorage } from "./storage";

const key = (tenantId: string) => `hr:${tenantId}:contracts`;

const seedContracts = (tenantId: string): Contract[] => [
  {
    id: `${tenantId}-con-001`,
    tenantId,
    employeeId: `${tenantId}-emp-001`,
    title: "Employment Agreement - Amelia Hart",
    type: "employment",
    status: "active",
    startDate: "2024-03-12",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: `${tenantId}-con-002`,
    tenantId,
    title: "Vendor Services Agreement - Benefits Provider",
    type: "vendor",
    status: "active",
    startDate: "2023-09-01",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: `${tenantId}-con-003`,
    tenantId,
    title: "Visa Case - Lina Park",
    type: "visa",
    status: "active",
    startDate: "2025-06-12",
    endDate: "2026-06-11",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: `${tenantId}-con-004`,
    tenantId,
    title: "Tax Compliance - Withholding Forms",
    type: "tax",
    status: "draft",
    startDate: "2026-01-10",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const contractRepo = {
  list(tenantId: string): Contract[] {
    return ensureSeed(key(tenantId), seedContracts(tenantId));
  },

  create(tenantId: string, payload: Omit<Contract, "id" | "tenantId" | "createdAt" | "updatedAt">): Contract {
    const contracts = this.list(tenantId);
    const now = new Date().toISOString();
    const contract: Contract = {
      ...payload,
      id: nextId(`${tenantId}-con`),
      tenantId,
      createdAt: now,
      updatedAt: now,
    };
    const updated = [contract, ...contracts];
    saveToStorage(key(tenantId), updated);
    return contract;
  },

  update(tenantId: string, contractId: string, patch: Partial<Contract>): Contract | null {
    const contracts = this.list(tenantId);
    let updatedContract: Contract | null = null;
    const updated = contracts.map((item) => {
      if (item.id !== contractId) return item;
      updatedContract = { ...item, ...patch, updatedAt: new Date().toISOString() };
      return updatedContract;
    });
    if (!updatedContract) return null;
    saveToStorage(key(tenantId), updated);
    return updatedContract;
  },
};
