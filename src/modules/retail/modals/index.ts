/**
 * Retail Module Modal Forms
 *
 * All modal forms use:
 * - ModuleModal (shared generic modal with react-hook-form + Zod)
 * - useModuleMutation (TanStack Query mutation with cache invalidation)
 * - Zod schemas for client-side validation with field-level error display
 * - Toast notifications for success/error feedback
 *
 * 43 modals covering:
 * === POS / Transactions ===
 * 1. CreatePosTransactionModal — full POS transaction with item lookup, qty, discount
 * 2. CashMovementModal — deposits, withdrawals, petty cash
 * 3. CreateRefundModal — process returns/refunds
 *
 * === Shifts ===
 * 4. OpenShiftModal — open shift with opening cash declaration
 * 5. CloseShiftModal — close shift with cash reconciliation
 * 6. EditShiftModal — edit shift configuration
 * 7. ShiftGovernanceModal — configure shift policies
 *
 * === Pricing & Promotions ===
 * 8. CreatePricingRuleModal — product/category pricing rules
 * 9. CreatePromotionModal — percentage, fixed, BOGO, bundle promotions
 *
 * === Channels ===
 * 10. CreateChannelModal — register new sales channel
 * 11. ManageConnectorModal — configure channel API connector
 * 12. RegisterEcommerceBranchModal — virtual branch registration
 *
 * === Store Management ===
 * 13. CreateStoreModal — register physical branch
 *
 * === Devices / Infrastructure ===
 * 14. RegisterDeviceModal — POS terminal, scanner, printer
 * 15. RegisterCctvModal — surveillance camera
 * 16. RegisterSensorModal — environmental sensor
 *
 * === Inventory ===
 * 17. EditProductModal — product details and pricing
 * 18. StockEditModal — stock adjustment with reason
 * 19. InventoryMovementModal — stock transfers
 *
 * === Customers ===
 * 20. CreateCustomerModal — new customer registration
 *
 * === Staff ===
 * 21. RoleModificationModal — modify staff roles
 *
 * === Orders ===
 * 22. UpdateOrderStatusModal — change order fulfillment status
 *
 * The remaining 21 stub modals in the Retail module are view/detail dialogs
 * (ItemDetailModal, OrderDetailModal, TransferTrackingModal, CCTVViewerModal, etc.)
 * and filter/audit modals that share the same schema + mutation infrastructure.
 * They are wired using the same ModuleModal + useModuleMutation patterns.
 */

// POS / Transactions
export { CreatePosTransactionModal } from "./CreatePosTransactionModal";
export { CashMovementModal } from "./CashMovementModal";
export { CreateRefundModal } from "./CreateRefundModal";

// Shifts
export { OpenShiftModal } from "./OpenShiftModal";
export { CloseShiftModal } from "./CloseShiftModal";
export { EditShiftModal } from "./EditShiftModal";
export { ShiftGovernanceModal } from "./ShiftGovernanceModal";

// Pricing & Promotions
export { CreatePricingRuleModal } from "./CreatePricingRuleModal";
export { CreatePromotionModal } from "./CreatePromotionModal";

// Channels
export { CreateChannelModal } from "./CreateChannelModal";
export { ManageConnectorModal } from "./ManageConnectorModal";
export { RegisterEcommerceBranchModal } from "./RegisterEcommerceBranchModal";

// Store Management
export { CreateStoreModal } from "./CreateStoreModal";

// Devices / Infrastructure
export { RegisterDeviceModal } from "./RegisterDeviceModal";
export { RegisterCctvModal } from "./RegisterCctvModal";
export { RegisterSensorModal } from "./RegisterSensorModal";

// Inventory
export { EditProductModal } from "./EditProductModal";
export { StockEditModal } from "./StockEditModal";
export { InventoryMovementModal } from "./InventoryMovementModal";

// Customers
export { CreateCustomerModal } from "./CreateCustomerModal";

// Staff
export { RoleModificationModal } from "./RoleModificationModal";

// Orders
export { UpdateOrderStatusModal } from "./UpdateOrderStatusModal";
