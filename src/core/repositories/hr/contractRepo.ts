import type { Contract, ContractStatus, ContractType } from "@/core/types/hr/contract";
import { prisma } from "@/core/persistence/database/client";

/**
 * Mapping helper for Contract
 */
const mapToContract = (db: any): Contract => ({
  id: db.id,
  tenantId: db.tenantId,
  employeeId: db.employeeId || undefined,
  title: db.title,
  type: db.type as ContractType,
  status: db.status as ContractStatus,
  startDate: db.startDate.toISOString().split('T')[0],
  endDate: db.endDate?.toISOString().split('T')[0],
  createdAt: db.createdAt.toISOString(),
  updatedAt: db.updatedAt.toISOString(),
} as Contract);

export const contractRepo = {
  /**
   * List all contracts for a tenant
   */
  async list(tenantId: string): Promise<Contract[]> {
    const list = await prisma.contract.findMany({
      where: {
        tenantId: tenantId,
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    return (Array.isArray(list) ? list : []).map(mapToContract);
  },

  /**
   * Create a new contract
   */
  async create(
    tenantId: string, 
    payload: Omit<Contract, "id" | "tenantId" | "createdAt" | "updatedAt">
  ): Promise<Contract> {
    const record = await prisma.contract.create({
      data: {
        tenantId: tenantId,
        employeeId: payload.employeeId,
        title: payload.title,
        type: payload.type,
        status: payload.status,
        startDate: new Date(payload.startDate),
        endDate: payload.endDate ? new Date(payload.endDate) : undefined,
      },
    });

    return mapToContract(record);
  },

  /**
   * Update an existing contract
   */
  async update(
    tenantId: string, 
    contractId: string, 
    patch: Partial<Contract>
  ): Promise<Contract | null> {
    const data: any = {};
    if (patch.title) data.title = patch.title;
    if (patch.type) data.type = patch.type;
    if (patch.status) data.status = patch.status;
    if (patch.startDate) data.startDate = new Date(patch.startDate);
    if (patch.endDate) data.endDate = new Date(patch.endDate);
    if (patch.employeeId) data.employeeId = patch.employeeId;

    const updated = await prisma.contract.update({
      where: {
        id: contractId,
        tenantId: tenantId,
      },
      data,
    });

    return mapToContract(updated);
  },
};
