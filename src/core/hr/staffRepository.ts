import type { StaffRecord } from "./hrTypes";

export interface StaffRepository {
  listStaff: (tenantId: string) => StaffRecord[];
  getStaff: (tenantId: string, staffId: string) => StaffRecord | undefined;
  createStaff: (tenantId: string, payload: StaffRecord) => StaffRecord;
  updateStaff: (tenantId: string, payload: StaffRecord) => StaffRecord;
  deactivateStaff: (tenantId: string, staffId: string) => StaffRecord | undefined;
}
