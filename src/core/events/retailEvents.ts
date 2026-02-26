export type RetailEventType =
  | "user_register"
  | "login"
  | "logout"
  | "wishlist_add"
  | "cart_add"
  | "cart_remove"
  | "checkout_started"
  | "payment_success";

export interface RetailEventScope {
  tenantId: string;
  branchId?: string;
  ecommerceId?: string;
}

export interface RetailEventAudit {
  traceId: string;
  receivedAt: string;
}

export interface RetailEvent {
  type: RetailEventType;

  timestamp: string;

  actor: {
    type: "visitor" | "customer";
    id: string;
  };

  payload: Record<string, any>;

  /**
   * Scope Enforcement
   * Prevents Company A leaking into Company B
   */
  scope: RetailEventScope;

  /**
   * Audit Metadata (added automatically)
   */
  audit?: RetailEventAudit;
}
