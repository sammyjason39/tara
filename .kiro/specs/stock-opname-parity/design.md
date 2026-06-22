# Design Document: Stock Opname Parity

## Overview

This design document translates the requirements for bringing Retail_Opname to parity with Core_Opname's unregistered-item handling.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Stock Opname Parity                         │
├─────────────────────────────────────────────────────────────────────┤
│  Core_Opname (existing)          │  Retail_Opname (new)             │
│  - Company-wide                  │  - Branch-scoped                   │
│  - Cross-branch location selector│  - Fixed to Active_Branch          │
│  - UnresolvedBarcodesModal       │  - UnresolvedBarcodesModal         │
│  - Quick Register (incomplete)   │  - Quick Register (incomplete)     │
└──────────────────────────────────┴────────────────────────────────────┘
```

### Component Hierarchy

```
UnresolvedBarcodesModal (shared)
├── QuickRegisterSection      // Non-blocking stub creation
├── AnomalyFlagSection        // Flag as anomalies for later review
├── DetailedRegistrationTab   // Full item creation (optional)
└── AnomalyCategoryIndicator  // Visual feedback
```

## Data Models

### OpnameSession

Session state shape for persistence:

```typescript
interface OpnameSession {
  cycleId: string;
  locationId: string;
  entries: ScanEntry[];
  unresolvedBarcodes: string[];
  anomalies: string[];
  newItems: any[];
  createdAt: number;
  lastUpdated: number;
}
```

### ScanEntry

```typescript
interface ScanEntry {
  id?: string;
  sku: string;
  name: string;
  systemCount: number;
  actualCount: number;
  timestamp: string;
  serials?: string[];
}
```

### AnomalyItem

```typescript
interface AnomalyItem {
  id: string;
  sku: string;
  name: string;
  barcode: string;
  category_id: string;
  is_anomaly: boolean;
  status: "incomplete";
  createdAt: string;
}
```

## Components and Interfaces

### UnresolvedBarcodesModal Props

```typescript
interface UnresolvedBarcodesModalProps {
  isOpen: boolean;
  onClose: () => void;
  unresolvedBarcodes: string[];
  onFlagAnomalies: (barcodes: string[]) => void;
  onItemsRegistered: (newItems: any[]) => void;
  categoryOptions: { id: string; name: string }[];
}
```

### Session Persistence API

```typescript
// Save session to localStorage
function saveOpnameSession(session: OpnameSession): void

// Load session from localStorage
function loadOpnameSession(): OpnameSession | null

// Clear session from localStorage
function clearOpnameSession(): void
```

## Key Changes

### 1. UnresolvedBarcodesModal Refactor

**Current Behavior:**
- Requires explicit user selection before registering items
- No Quick Register option - forces detailed registration or flagging
- Modal closes properly but doesn't handle page reload

**New Behavior:**
- Pre-select all barcodes on open
- Add "Quick Register" button that creates incomplete items without user input
- Items created with status="incomplete" and category="Anomaly"
- Persist session state to localStorage to survive reload

### 2. Session Persistence

**Requirements:**
- Save scanned counts and unresolved barcodes to localStorage
- Restore on page load during active session
- Clear on commit or explicit cancel

**Implementation:**
- Store `OpnameSession` to `localStorage` under key `opname_session_<tenantId>`
- Restore session on component mount if session exists
- Clear on commit, cancel, or explicit session close

### 3. Anomaly Handling

**New Fields:**
- `anomaly_category_id`: Reserved category for incomplete items
- `is_anomaly`: Persisted boolean flag on items

**Backend Changes:**
- Create "Anomaly" category on first tenant usage (idempotent)
- Mark created items with `is_anomaly: true`
- Allow filtering by `is_anomaly: true`

### 4. Retail Opname Integration

**Changes to StockOpnameScanner.tsx:**
- Import and use `UnresolvedBarcodesModal` (already imported)
- Remove inline "Invalid SKU" toast
- Add unregistered barcode to unresolved list
- Use same resolution flow as Core_Opname

**Changes to InventoryVisibility.tsx:**
- StockOpnameTab already uses inventory service
- Need to add unresolved barcodes handling
- Branch scoping: filter item lookups to active store

## Data Flow

```
Scan Barcode
    ↓
Is Registered?
    ├─ YES → Add to count
    └─ NO → Add to unresolvedBarcodes[]

Commit Audit
    ↓
Unresolved > 0?
    ├─ YES → Open UnresolvedBarcodesModal
    └─ NO → Show summary

Modal Actions:
1. Quick Register → Create incomplete items, remove from unresolved
2. Flag Anomalies → Mark as anomalies, remove from unresolved
3. Register with Details → Show full creation form
```

## Implementation Tasks

### Phase 1: Core Changes (Required for Both Surfaces)

- [ ] 1.1 Refactor UnresolvedBarcodesModal
  - Pre-select all barcodes on open
  - Add Quick Register button
  - Items created with `is_anomaly: true` and `category_id = "anomaly"`
  - Clear selection after successful registration

- [ ] 1.2 Implement Session Persistence
  - Add `OpnameSession` interface
  - Save to localStorage on every change
  - Restore on component mount if session exists
  - Clear on commit or cancel

- [ ] 1.3 Backend: Anomaly Category
  - Create "Anomaly" category on first tenant usage
  - Return category ID in response
  - Allow filtering by `is_anomaly: true`

### Phase 2: Retail Opname Specific (Required)

- [ ] 2.1 StockOpnameScanner Integration
  - Use `UnresolvedBarcodesModal` for unregistered scans
  - Remove inline error toast
  - Persist session state

- [ ] 2.2 InventoryVisibility StockOpnameTab
  - Add unresolved barcodes handling
  - Filter item lookups to active branch
  - Persist session state

### Phase 3: Anomaly Management (Follow-up)

- [ ] 3.1 Anomaly Browser
  - Filter items where `is_anomaly: true`
  - Show items awaiting completion
  - Allow editing and category change

- [ ] 3.2 Completion Flow
  - Edit incomplete item
  - Update required fields
  - Clear `is_anomaly` flag
  - Change category away from "Anomaly"

## Backend API Changes

### New/Modified Endpoints

#### 1. Create "Anomaly" Category (Idempotent)

```http
POST /inventory/categories/anomaly
```

**Response:**
```json
{
  "id": "cat-anomaly-123",
  "name": "Anomaly",
  "is_anomaly_category": true,
  "created_at": "2026-06-16T..."
}
```

#### 2. Batch Create Incomplete Items (Quick Register)

```http
POST /inventory/items/batch-incomplete
```

**Request:**
```json
{
  "items": [
    {
      "barcode": "123456789",
      "name": "Unregistered Item - 123456789"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "item-456",
      "sku": "123456789",
      "name": "Unregistered Item - 123456789",
      "category_id": "cat-anomaly-123",
      "is_anomaly": true,
      "status": "incomplete"
    }
  ]
}
```

#### 3. Mark Items as Anomalies

```http
POST /inventory/items/mark-anomalies
```

**Request:**
```json
{
  "item_ids": ["item-1", "item-2"],
  "reason": "Registered during stock opname"
}
```

**Response:**
```json
{
  "success": true,
  "count": 2
}
```

## Correctness Properties

### Property 1: Modal close never leaves page locked - **Validates: Requirements 3, 3.1, 3.3, 3.4**

**Invariant:** After `UnresolvedBarcodesModal` closes, `document.body` must have `pointer-events: auto` and all controls must be interactive.

**Test Cases:**
1. Close via close button → controls enabled
2. Close via overlay click → controls enabled
3. Close via Escape key → controls enabled
4. Quick Register success → controls enabled

### Property 2: Session persistence survives reload - **Validates: Requirements 4, 4.1, 4.2, 4.3, 4.4**

**Invariant:** For any valid `OpnameSession`, after `saveOpnameSession()` and `window.location.reload()`, `loadOpnameSession()` must return equivalent data.

**Test Cases:**
1. Save session → reload → restore matches
2. Save session → commit → reload → session cleared
3. Save session → cancel → reload → session cleared

### Property 3: Quick Register creates items with anomaly flag - **Validates: Requirements 1, 1.1, 1.2, 1.3, 1.4, 1.5**

**Invariant:** After `handleQuickRegisterIncomplete()`, all created items must have:
- `is_anomaly: true`
- `category_id = anomaly_category_id`
- `status = "incomplete"`

## Error Handling

### UnresolvedBarcodesModal Errors

| Error | User Action |
|-------|-------------|
| Quick Register fails | Show error toast, keep barcodes in unresolved list |
| Flag anomalies fails | Show error toast, barcodes remain in unresolved list |
| Modal open fails | Log error, user must retry |

### Session Persistence Errors

| Error | User Action |
|-------|-------------|
| localStorage save fails | Log error, session may be lost on reload |
| localStorage load fails | Log error, start fresh session |
| localStorage clear fails | Log error, continue without side effects |

### Backend Errors

| Error | User Action |
|-------|-------------|
| Create Anomaly category fails | Fallback to existing category or show error |
| Batch create items fails | Show error, keep barcodes unresolved |
| Mark anomalies fails | Show error, user must retry |

## Testing Strategy

### Unit Tests
- Quick Register creates items with `is_anomaly: true`
- Session save/restore works correctly
- Modal close does not page lock
- Toggle select all works correctly

### Integration Tests
- End-to-end opname flow with unresolved barcodes
- Retail opname branch scoping
- Session survives page reload
- Multiple users on different branches

### E2E Tests
- Complete opname workflow (start → scan → unresolved → resolve → commit)
- Multiple unresolved barcodes
- Concurrent sessions
- Browser refresh during active session

## Rollout Plan

1. **Deploy backend changes first**
   - Create Anomaly category endpoint
   - Quick register endpoint
   - Anomaly flagging endpoint

2. **Deploy frontend changes**
   - Refactor UnresolvedBarcodesModal
   - Add session persistence
   - Update Retail opname components

3. **Monitor and iterate**
   - Track usage of Quick Register vs detailed registration
   - Collect feedback on anomaly workflow
   - Refine as needed