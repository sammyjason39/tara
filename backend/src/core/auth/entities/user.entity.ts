export class User {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone?: string;
  status: string;
  created_at: Date;
  updated_at: Date;
  userCompanies?: UserCompany[];
}

export class UserCompany {
  id: string;
  user_id: string;
  tenant_id: string;
  role: string;
  isDefault: boolean;
  company?: any; // Avoiding deep circular imports for now
}
