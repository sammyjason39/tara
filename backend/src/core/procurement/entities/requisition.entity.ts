export class Requisition {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  category: string;
  budgetClass: "OPEX" | "CAPEX";
  requesterDept: string;
  branchCode: string;
  amount: number;
  currency: "IDR" | "USD";
  status:
    | "PENDING_REQUESTER_HOD"
    | "APPROVED_REQUESTER_HOD"
    | "DRAFT_PREPARED"
    | "FINAL_APPROVED"
    | "PO_RELEASED"
    | "REJECTED";
  approvals: any;
  contractRequired: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
