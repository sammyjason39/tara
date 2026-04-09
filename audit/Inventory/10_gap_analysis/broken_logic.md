# Broken Logic - Inventory Department

## 1. Batch Consumption Logic
- **Issue**: `POST /consumption/batch` processes each item sequentially.
- **Risk**: If item 5/10 fails due to insufficient stock, the first 4 items remain consumed. 
- **Requirement**: Use a Single Prisma Transaction for the entire batch.
- **Status**: ❌ BROKEN (Current implementation lacks batch-wide atomicity).

## 2. Low-Stock Alert Deduplication
- **Issue**: Every `consumeStock` checks for Low Stock threshold.
- **Risk**: If stock is at 1 units and min_buffer is 5, every single sale generates a NEW alert.
- **Requirement**: Check if an `OPEN` alert already exists for the SKU/Location before creating a new one.
- **Status**: ❌ BROKEN (Alert spam risk).

## 3. SKU Uniqueness UI Check
- **Issue**: `GET /sku-exists` does not correctly handle URL-encoded special characters in SKU strings.
- **Requirement**: Standardize URL encoding in the Controller.
- **Status**: ⚠️ PARTIAL (Works for simple SKUs only).

## 4. Logical Item Deletion
- **Issue**: Deleting an item with `stock_level > 0` should be disallowed.
- **Requirement**: `InventoryService.deleteItem` must check `SUM(stock_levels.on_hand) == 0`.
- **Status**: ❌ BROKEN (Current logic allows deleting items that are still physically present).
