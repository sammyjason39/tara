export interface ProvisioningResult {
  tenant_id: string;
  company_name: string;
  location_id: string;
  department_id: string;
}

export interface ProvisioningData {
  tenant_id: string;
  user_id: string;
  name: string;
  country: string;
  currency: string;
  industry: string;
  address: string;
  user: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
}
