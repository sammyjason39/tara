# Request Response Contracts - Inventory Department

## DTO Validation Analysis

### CreateItemDto
- **Key Fields**: `sku` (Mandatory), `name` (Mandatory), `category` (Mandatory), `uom` (Mandatory).
- **Validation**: Uses `class-validator` (@IsString, @IsNotEmpty).
- **Flexibility**: `category` is a `string` (not an enum here) to allow custom categorization per tenant.
- **Risk**: `basePrice` and `taxRate` are `@IsOptional()`. Items could be created with NULL costs, which would break valuation logic.

### TransferStockDto
- **Key Fields**: `itemId`, `fromLocationId`, `toLocationId`, `quantity`.
- **Constraint**: `@Min(0.0001)` on `quantity`. This allows fractional transfers (Real-world use: 0.5 kg of flour).
- **Traceability**: `referenceId` and `referenceType` are optional but highly recommended.
- **Inconsistency**: `createdBy` is optional in the DTO, but the service often uses "system" as default. Audit-grade systems should always require a `user_id`.

## Response Envelopes
- **Format**: Standard JSON objects mapped from Prisma entities.
- **Transformations**: `active` boolean is mapped from `status === "active"`.
- **Relations**: `GET /balances` returns fully joined `product`, `location`, and `department` objects.

## Gap: Idempotency Requirements
- **Observation**: `InventoryController` endpoints do not explicitly require Header `x-idempotency-key` for stock mutations (Intake/Transfer).
- **Risk**: Double-submit of a `POST /intake` could double the stock levels if not handled at the application layer.
- **Finding**: IDEMPOTENCY is handled globally in the base platform, but not enforced specifically in this module's DTOs.
