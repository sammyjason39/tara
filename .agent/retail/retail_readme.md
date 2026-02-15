# 🏬 Zenvix Retail Module — README & Locked Specification

> **Permanent Lock:** This document defines the full Retail Module scope. All implementation must follow this. No deviation permitted.

---

## Table of Contents

1. [Overview](#1-overview)  
2. [Retail Authority & Commerce Boundary](#2-retail-authority--commerce-boundary)  
3. [Supported Retail Channels](#3-supported-retail-channels)  
4. [Multi-Tenant & Store Isolation](#4-multi-tenant--store-isolation)  
5. [Workforce & Shift-Based Access](#5-workforce--shift-based-access)  
6. [UI/UX Structure](#6-uiux-structure)  
7. [Device Management](#7-device-management)  
8. [Inventory Selling Enforcement](#8-inventory-selling-enforcement)  
9. [Offline Execution](#9-offline-execution)  
10. [Core Edge Sync Dependency](#10-core-edge-sync-dependency)  
11. [Core Payment Dependency](#11-core-payment-dependency)  
12. [Promotions & Pricing Governance](#12-promotions--pricing-governance)  
13. [License Enforcement & Freeze](#13-license-enforcement--freeze)  
14. [Compliance & Audit](#14-compliance--audit)  
15. [Final Locked Statement](#15-final-locked-statement)  

---

## 1. Overview

Zenvix Retail Module is the **Commerce Execution Authority** for all selling channels.

- Handles physical store POS operations  
- Governs ecommerce and marketplace channels  
- Provides operational and management dashboards per store and device  
- Fully integrates with Core engines: Payment, Inventory, Workforce, Edge Sync  
- Supports enterprise-scale multi-store operations as well as small shops  

---

## 2. Retail Authority & Commerce Boundary

- Retail is the **master commerce authority**  
- No commerce channel may exist outside Retail  
- All orders, payments, and promotions flow through Retail  
- Retail license governs all dependent channels  

**Locked Rule:** Retail cannot bypass Core engines.  

---

## 3. Supported Retail Channels

| Channel Type | Description |
|-------------|------------|
| Physical POS Store | In-store terminals for cashier and operational workflows |
| Ecommerce Website | External website integrated via Retail Commerce Gateway |
| Marketplace Connector | Future expansion for marketplaces |
| Mobile Ordering | Future expansion for mobile apps |

**Mandatory Integration:** All storefront APIs must go through Retail Gateway; direct Core API calls are forbidden.

---

## 4. Multi-Tenant & Store Isolation

- Each tenant is isolated  
- Store employees cannot access other stores by default  
- Store Selector locks store scope per shift  
- Superadmins select tenant explicitly  

| Role | Store Access |
|------|-------------|
| Cashier / Floor Staff | Single assigned store |
| Store Admin | Single store |
| Regional Manager | Assigned stores |
| Owner | All stores |
| Superadmin | Tenant-select then view |

---

## 5. Workforce & Shift-Based Access

- Retail relies on **Core Workforce Scheduling Engine** and **Attendance Engine**  
- Fixed or rolling employee models supported  

**Access Rule:**  

```Text
allow_access:
  - active_shift_assignment
  - attendance_confirmed
  - store_device_match
```

- Employees must clock in at assigned store to unlock **Retail Operational workspace**.  
- Multi-store shifts are supported with automatic scope transitions.

---

## 6. UI/UX Structure

Retail workspace is divided into **two planes**:

### 6.1 Management Workspace

- **Command Center**: Multi-store overview, alerts, KPIs  
- **Store Administration**: Profile, warehouse, device mapping  
- **Orders & Fulfillment**: Unified order stream, pick/pack/ship  
- **Promotions & Pricing Requests**: Maker-checker approvals  
- **Audit Ledger**: Immutable transaction logs  
- **License Freeze Status**

### 6.2 Operational Workspace (Device-Specific)

- **POS Terminal / Cashier**: Cart, scan, payment via Core  
- **Refund Desk Terminal**: Secure refund processing  
- **Stock Opname Scanner**: Barcode/RFID stock counting  
- **Receiving Terminal**: Inbound stock processing  
- **Shift Close Terminal**: Cash reconciliation, shift close  

---

## 7. Device Management

- Supported devices: barcode, RFID, QR scanners, POS terminals  
- Remote enable/disable and priority routing  
- Scan events logged immutably to **Core Sync ledger**  
- Device access tied to shift assignment and attendance  

---

## 8. Inventory Selling Enforcement

- Inventory ledger remains under **Inventory Module**  
- Retail enforces reservation and **Available-to-Sell (ATS)** rules  
- Prevents overselling, double booking, offline conflicts  

---

## 9. Offline Execution

### 9.1 Small Business / Offline POS

- LAN-first local queue  
- Cash sales allowed  
- Card, QRIS, e-wallet disabled offline  

### 9.2 Enterprise / Edge Node

- Multi-POS synchronization  
- Strong fraud control  
- Conflict detection and recovery via **Core Edge Sync**  

---

## 10. Core Edge Sync Dependency

- All offline events synced via **Core Edge Sync**  
- Durable event ledger, ordering, conflict resolution  
- No module-specific sync engine allowed  
- Retail provides **adapter interfaces only**  

---

## 11. Core Payment Dependency

- Retail cannot own or settle payments  
- Payments flow via **Core Payment Engine** only  

```text
Retail Checkout → Core Payment Intent → Provider → Core Ledger Lock → Retail Order Finalization

- Offline payments limited to **cash** or **vouchers**  
- Fraud control, chargebacks, and audit handled by **Core Payment Engine**

---

## 12. Promotions & Pricing Governance

- Maker-checker approvals required from:  
  - Store Admin  
  - Store HOD  
  - Sales / Marketing  

- Finance HOD approval is **mandatory**  

- Owner bypass allowed only with:  
  - Proper justification  
  - Elevated fraud audit flag  

---

## 13. License Enforcement & Freeze

- Retail license governs all dependent channels  
- Expiry triggers **Frozen State**:

| Component              | Status      |
|------------------------|------------|
| POS Selling            | Blocked    |
| Ecommerce Checkout     | Blocked    |
| Stock Reservation      | Blocked    |
| Order Creation         | Blocked    |
| Payments               | Blocked    |
| Fulfillment Updates    | Read-only  |
| Audit & Reporting      | Read-only  |

- Freeze preserves audit and compliance integrity  
- Offline selling buffer is **disabled**  

---

## 14. Compliance & Audit

- Immutable **transaction history**  
- Immutable **approval trails**  
- Immutable **device scan logs**  
- Exportable **compliance reports**  
- Freeze state **never deletes data**  

---

## 15. Final Locked Statement

- Retail is the **master commerce authority**  
- Channels exist **only under Retail Gateway**  
- Payments execute only via **Core Payment Engine**  
- Offline + multi-device sync through **Core Edge Sync**  
- Workforce access enforced by **Core Scheduling + Attendance**  
- License expiry **immediately locks all commerce activities**  
- Store isolation is strictly enforced  
- Supports both **enterprise** and **small business** models  

---

# ✅ Permanent Lock

This README is the **official, permanently locked specification** for the Zenvix Retail Module.  
All future implementations — human or AI — must follow this **verbatim**.  

**LOCKED: Retail Module — No Redesign Allowed**
