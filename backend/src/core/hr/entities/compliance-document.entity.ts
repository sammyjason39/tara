export class ComplianceDocument {
  id: string;
  tenant_id: string;
  employee_id: string;
  documentType: string;
  documentNumber?: string;
  fileUrl: string;
  expiryDate?: Date;
  verification_status: string;
  verified_by?: string;
  verified_at?: Date;
  metadata?: any;
  created_at: Date;
  updated_at: Date;
}
