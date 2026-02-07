import type { RecruitmentRequisition } from "@/core/types/hr/recruitment";
import { ensureSeed, nextId, saveToStorage } from "./storage";

const key = (tenantId: string) => `hr:${tenantId}:recruitment`;

const seedRequisitions = (tenantId: string): RecruitmentRequisition[] => [
  {
    id: `${tenantId}-req-001`,
    tenantId,
    title: "Store Manager",
    departmentId: "dept-ops",
    status: "interview",
    openings: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: `${tenantId}-req-002`,
    tenantId,
    title: "Operations Analyst",
    departmentId: "dept-ops",
    status: "offer",
    openings: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: `${tenantId}-req-003`,
    tenantId,
    title: "HR Officer",
    departmentId: "dept-hr",
    status: "screening",
    openings: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const recruitmentRepo = {
  list(tenantId: string): RecruitmentRequisition[] {
    return ensureSeed(key(tenantId), seedRequisitions(tenantId));
  },

  create(
    tenantId: string,
    payload: Omit<RecruitmentRequisition, "id" | "tenantId" | "createdAt" | "updatedAt">,
  ): RecruitmentRequisition {
    const records = this.list(tenantId);
    const now = new Date().toISOString();
    const record: RecruitmentRequisition = {
      ...payload,
      id: nextId(`${tenantId}-req`),
      tenantId,
      createdAt: now,
      updatedAt: now,
    };
    const updated = [record, ...records];
    saveToStorage(key(tenantId), updated);
    return record;
  },
};
