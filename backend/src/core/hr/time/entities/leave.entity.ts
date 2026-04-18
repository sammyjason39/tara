export interface LeaveRequest {
  id: string;
  tenant_id: string;
  employee_id: string;
  type: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  start_date: Date;
  end_date: Date;
  reason?: string;
  created_at: Date;
  updated_at: Date;
}
