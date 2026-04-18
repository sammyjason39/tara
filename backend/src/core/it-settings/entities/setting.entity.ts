/**
 * Setting Entity
 * Represents tenant-specific configuration settings
 */
export class Setting {
  id: string;
  tenant_id: string;
  key: string;
  value: string;
  category: "general" | "finance" | "hr" | "security" | "integration";
  isPublic: boolean;
  description?: string;
  created_at: Date;
  updated_at: Date;
}
