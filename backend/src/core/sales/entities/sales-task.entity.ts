export class SalesTask {
  id: string;
  tenantId: string;
  opportunityId?: string;
  leadId?: string;
  title: string;
  ownerId: string;
  ownerName: string;
  status: 'pending' | 'in_progress' | 'done' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
