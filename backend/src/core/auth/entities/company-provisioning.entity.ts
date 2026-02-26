export interface ProvisioningResult {
  tenantId: string;
  companyName: string;
  locationId: string;
  departmentId: string;
}

export interface ProvisioningData {
  userId: string;
  name: string;
  country: string;
  currency: string;
  industry: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
}
