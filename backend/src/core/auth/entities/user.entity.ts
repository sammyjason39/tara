export class User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  userCompanies?: UserCompany[];
}

export class UserCompany {
  id: string;
  userId: string;
  tenantId: string;
  role: string;
  isDefault: boolean;
  company?: any; // Avoiding deep circular imports for now
}
