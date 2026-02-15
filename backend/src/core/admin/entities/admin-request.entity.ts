export class AdminRequest {
  id: string;
  tenantId: string;
  type: 'access' | 'module_toggle' | 'compliance' | 'other';
  title: string;
  detail: string;
  status: 'open' | 'in_progress' | 'resolved';
  requestedBy: string;
  resolvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

