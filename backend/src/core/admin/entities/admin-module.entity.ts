export class AdminModuleStatus {
  id: string;
  tenantId: string;
  moduleKey: 'finance' | 'hr' | 'inventory' | 'procurement' | 'admin' | 'it';
  enabled: boolean;
  updatedBy: string;
  updatedAt: Date;
}

