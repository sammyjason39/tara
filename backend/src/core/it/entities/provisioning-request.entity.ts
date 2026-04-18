export class ProvisioningRequest {
  id: string;
  tenant_id: string;
  employee_id?: string;
  supplierId?: string;
  supplierBranchId?: string;
  scope: "quote" | "invoice" | "delivery_proof" | "full_portal";
  priority: string;
  description?: string;
  reason: string;
  status: "requested" | "provisioned" | "revoked";
  requested_by: string;
  provisionedBy?: string;
  created_at: Date;
  updated_at: Date;
}
