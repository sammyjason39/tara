export class Requisition {
  id: string;
  tenantId: string;
  title: string;
  requesterDept: string;
  branchCode: string;
  amount: number;
  currency: 'IDR' | 'USD';
  status:
    | 'pending_requester_hod'
    | 'approved_requester_hod'
    | 'draft_prepared'
    | 'final_approved'
    | 'po_released'
    | 'rejected';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

