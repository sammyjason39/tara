import type { HRAuditFields } from "../hr/base";

export interface PayslipComponent {
  id: string;
  type: "header" | "identity" | "earnings" | "deductions" | "summary" | "footer" | "custom_text";
  title: string;
  visible: boolean;
  order: number;
  config?: any; // Specific settings for each component type
}

export interface PayslipTemplate extends HRAuditFields {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  layout: PayslipComponent[];
  branding: {
    logoUrl?: string;
    primaryColor?: string;
    showCompanyAddress: boolean;
  };
}
