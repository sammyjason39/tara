# Side Effects - Inventory Department

## 1. On State Change: Adjustment Approved
- **Internal**: `stock_movement` entry created correctly.
- **External**: Emit `INVENTORY_ADJUSTMENT_APPROVED` (Finance listener will update `inventory_ledger`).
- **Notification**: Alert User (Requested By) that the stock has been re-balanced.

## 2. On State Change: Reservation Confirmed
- **Internal**: `stock_movement` (Consumption) created.
- **External**: Emit `RETAIL_ORDER_FULFILLED` (if confirmed via sales) or `IT_PROVISIONING_COMPLETE`.
- **System**: Trigger `valuation_recalculation` job.

## 3. On State Change: Expiration (Cron Job)
- **Internal**: Update `stock_reservations` records and release `reserved` quantity.
- **External**: Emit `RESERVATION_EXPIRED` (Sales module cleanup: release items back to customer cart or wishlist).

## 4. On State Change: Low Stock Threshold
- **Internal**: Check `available < min_buffer`.
- **System**: Create `inventory_alerts` record (Status: OPEN).
- **External**: Emit `INVENTORY_LOW_STOCK` (Procurement listener: Auto-generate `requisition_draft`).
