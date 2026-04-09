# Request/Response Contracts: Procurement

## 1. Core Workflow DTOs

### `CreateRequisitionDto`
- **Request Body**:
  ```json
  {
    "title": "string",
    "description": "string",
    "category": "string",
    "requesterDept": "string",
    "branchCode": "string",
    "amount": "number",
    "currency": "string?"
  }
  ```
- **Response Object**: `Requisition` (Status: `PENDING_REQUESTER_HOD`)

### `CreateDraftPoDto`
- **Request Body**:
  ```json
  {
    "requisitionId": "string",
    "supplierId": "string",
    "supplierBranchId": "string",
    "contractType": "string",
    "lineItems": "Array<{sku: string, quantity: number, unitPrice: number}>",
    "quotedTotal": "number?"
  }
  ```
- **Response Object**: `DraftPO` (Status: `DRAFT`)

### `ConfirmQuoteDto`
- **Request Body**:
  ```json
  {
    "quoteReference": "string",
    "quotedTotal": "number?",
    "attachmentId": "string?"
  }
  ```

### `ReleasePoDto`
- **Request Body**:
  ```json
  {
    "requisitionId": "string",
    "supplierId": "string",
    "totalAmount": "number"
  }
  ```

## 2. Supplier Management DTOs

### `CreateSupplierDto`
- **Request Body**:
  ```json
  {
    "name": "string",
    "taxId": "string",
    "category": "string",
    "branchCode": "string",
    "address": "string?",
    "contactPerson": "string?",
    "contactEmail": "string?",
    "contactPhone": "string?",
    "website": "string?"
  }
  ```

### `CreateReceiptDto`
- **Request Body**:
  ```json
  {
    "finalPoId": "string",
    "deliveryOnTime": "boolean",
    "quantityAccuracy": "number (0-100)",
    "qualityScore": "number (0-100)",
    "issueCount": "number",
    "invoiceMismatch": "boolean"
  }
  ```

## 3. Global Response Pattern
All endpoints wrap data in a standard Zenvix response:
```json
{
  "success": true,
  "tenantId": "uuid",
  "message": "Human readable confirmation",
  "data": { ...entity }
}
```
In case of error:
```json
{
  "statusCode": 400,
  "message": "Error details",
  "error": "Bad Request"
}
```
