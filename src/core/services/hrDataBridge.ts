export type StaffRecord = {
  id: string;
  tenantId: string;
  fullName: string;
  departmentId: string;
  roleTitle: string;
  status: "active" | "on_leave" | "inactive";
};

export type PayrollCycle = {
  id: string;
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  status: "draft" | "pending" | "approved" | "exported";
};

export type ComplianceContract = {
  id: string;
  tenantId: string;
  title: string;
  type: "internal" | "external";
  status: "draft" | "active" | "expired";
  expiryDate?: string;
};

type ModuleBridge = {
  getStaffList: (tenantId: string) => StaffRecord[];
  getStaffById: (tenantId: string, staffId: string) => StaffRecord | undefined;
  getPayrollCycles: (tenantId: string) => PayrollCycle[];
  getComplianceContracts: (tenantId: string) => ComplianceContract[];
};

let moduleProvider: ModuleBridge | null = null;

export function registerHrModuleProvider(provider: ModuleBridge) {
  moduleProvider = provider;
}

const mockStaff: StaffRecord[] = [
  {
    id: "staff-001",
    tenantId: "tenant-001",
    fullName: "Amelia Hart",
    departmentId: "dept-ops",
    roleTitle: "Regional Manager",
    status: "active",
  },
  {
    id: "staff-002",
    tenantId: "tenant-002",
    fullName: "Victor Lim",
    departmentId: "dept-fin",
    roleTitle: "Finance Controller",
    status: "active",
  },
];

export function getStaffList(tenantId: string): StaffRecord[] {
  if (moduleProvider) return moduleProvider.getStaffList(tenantId);
  // Support both tenant-specific and generic demo data if tenantId is 'tenant-demo'
  return mockStaff.filter((staff) => staff.tenantId === tenantId);
}

export function getStaffById(tenantId: string, staffId: string): StaffRecord | undefined {
  if (moduleProvider) return moduleProvider.getStaffById(tenantId, staffId);
  return mockStaff.find((staff) => staff.tenantId === tenantId && staff.id === staffId);
}

export function getPayrollCycles(tenantId: string): PayrollCycle[] {
  if (moduleProvider) return moduleProvider.getPayrollCycles(tenantId);
  return [
    {
      id: `${tenantId}-cycle-01`,
      tenantId,
      periodStart: "2026-02-01",
      periodEnd: "2026-02-15",
      status: "draft",
    },
  ];
}

export function getComplianceContracts(tenantId: string): ComplianceContract[] {
  if (moduleProvider) return moduleProvider.getComplianceContracts(tenantId);
  return [
    {
      id: `${tenantId}-contract-01`,
      tenantId,
      title: "Employment Agreement - Ops",
      type: "internal",
      status: "active",
      expiryDate: "2027-01-30",
    },
  ];
}
