export class ProvisioningRequest {
  id: string;
  tenantId: string;
  supplierId: string;
  supplierBranchId: string;
  scope: 'quote' | 'invoice' | 'delivery_proof' | 'full_portal';
  reason: string;
  status: 'requested' | 'provisioned' | 'revoked';
  requestedBy: string;
  provisionedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

