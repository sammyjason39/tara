# State Machine: Procurement

## 1. Purchase Requisition (PR)
Defines the lifecycle of a purchase intent.

```mermaid
stateDiagram-v2
    [*] --> DRAFT
    DRAFT --> PENDING_REQUESTER_HOD: Submit
    PENDING_REQUESTER_HOD --> APPROVED_REQUESTER_HOD: HOD Appr
    PENDING_REQUESTER_HOD --> REJECTED: HOD Reject
    
    APPROVED_REQUESTER_HOD --> FINAL_APPROVAL_PENDING: Finance Step
    FINAL_APPROVAL_PENDING --> FINAL_APPROVED: Finance Appr
    FINAL_APPROVED --> DRAFT_PO_PREPARED: Create Draft PO
    
    DRAFT_PO_PREPARED --> DRAFT_PO_APPROVED: Proc HOD Appr
    DRAFT_PO_APPROVED --> SUPPLIER_CONFIRMED: Quote Confirmed
    SUPPLIER_CONFIRMED --> PO_RELEASED: Release PO
    PO_RELEASED --> [*]
```

## 2. Procurement Contract
High-value purchase legal wrapper.

```mermaid
stateDiagram-v2
    [*] --> LEGAL_REVIEW
    LEGAL_REVIEW --> LEGAL_APPROVED: Legal Appr
    LEGAL_APPROVED --> PARTIAL_SIGNED: One party signs
    PARTIAL_SIGNED --> SIGNED: All parties signed
```

## 3. Draft Purchase Order
Internal coordination document.

```mermaid
stateDiagram-v2
    [*] --> DRAFT
    DRAFT --> PROCUREMENT_HOD_APPROVED: Specialist Submit
    PROCUREMENT_HOD_APPROVED --> SUPPLIER_CONFIRMED: Supplier Quote Recv
```

## 4. Final Purchase Order
External legal commitment.

```mermaid
stateDiagram-v2
    [*] --> RELEASED
    RELEASED --> RECEIVED: Reception Logic
    RELEASED --> PARTIALLY_RECEIVED: Partial Reception
    PARTIALLY_RECEIVED --> RECEIVED: Remaining Reception
```
