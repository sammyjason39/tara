import type { HRAuditFields } from "../hr/base";

export interface ReceiptComponent {
  id: string;
  type: "header" | "transaction_info" | "item_list" | "totals_ledger" | "payment_info" | "qr_code" | "footer_text";
  title: string;
  visible: boolean;
  order: number;
  config?: {
    alignment?: "left" | "center" | "right";
    bold?: boolean;
    fontSize?: "small" | "medium" | "large";
    content?: string;
  };
}

export interface ReceiptTemplate extends HRAuditFields {
  id: string;
  tenantId: string;
  name: string;
  isDefault: boolean;
  paperWidth: "58mm" | "80mm";
  layout: ReceiptComponent[];
  branding?: {
    logoUrl?: string;
    showStoreAddress: boolean;
    headerText?: string;
  };
}
