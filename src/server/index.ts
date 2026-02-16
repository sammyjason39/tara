// src/server/index.ts
/**
 * ============================================================
 * ZENVIX RETAIL BACKEND ENGINE (TRIAL)
 *
 * Purpose:
 * - Sync Zenvix Retail + External Ecommerce Websites
 *
 * Guarantees:
 * - Immutable Audit Ledger
 * - Event Engine Processing
 * - Tenant + Ecommerce Isolation
 *
 * Trial Storage:
 * - JSON persistence under .db/
 *
 * Future:
 * - Postgres Multi-Tenant Ledger Tables
 * ============================================================
 */

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

import { retailRepo } from "@/core/repositories/retail/retailRepo";
import { mockInventoryRepo } from "@/core/repositories/inventory/mockInventoryRepo";

import { appendRetailEvent } from "@/core/logging/eventLedger";
import { processRetailEvent } from "@/core/engines/retail/eventProcessor";

import { verifyEcommerceSite } from "@/server/middleware/verifyEcommerceSite";

import type { RetailEvent } from "@/core/events/retailEvents";

const app = express();
const PORT = 3000;

/**
 * ============================================================
 * GLOBAL MIDDLEWARE
 * ============================================================
 */

app.use(cors());
app.use(bodyParser.json());

/**
 * Request Logger (Trial Debug Mode)
 */
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

/**
 * ============================================================
 * RETAIL EVENT API (Ecommerce → Zenvix Core)
 *
 * External ecommerce websites MUST send:
 * - user_register
 * - login/logout
 * - wishlist_add/remove
 * - cart_add/remove
 * - payment_success
 *
 * Zenvix Guarantees:
 * - Immutable audit ledger
 * - Engine processing → Orders / Profiles
 * - Strict company/branch/ecommerce isolation
 * ============================================================
 */

app.post(
  "/api/retail/events",

  /**
   * 🔒 Ecommerce Verification Layer
   * Ensures:
   * - Ecommerce A cannot impersonate Ecommerce B
   * - Company A cannot leak into Company B
   */
  verifyEcommerceSite,

  (req, res) => {
    try {
      const event = req.body as RetailEvent;

      /**
       * ============================================================
       * 1. Basic Schema Validation (Trial)
       * ============================================================
       */
      if (!event.type || !event.actor || !event.timestamp) {
        return res.status(400).json({
          success: false,
          error: "Invalid Event Schema",
        });
      }

      /**
       * ============================================================
       * 2. Inject Trusted Scope (LOCKED)
       *
       * Ecommerce never controls tenant/company scope.
       * Zenvix injects it after verification.
       * ============================================================
       */
      const scope = (req as any).ecommerceScope;

      event.scope = {
        companyId: scope.companyId,
        branchId: scope.branchId,
        ecommerceId: scope.ecommerceId,
      };

      /**
       * ============================================================
       * 3. Immutable Audit Append
       *
       * Stored under:
       * audit:retail:<company>:<day>
       * ============================================================
       */
      const ledger = appendRetailEvent(event);

      /**
       * ============================================================
       * 4. Retail Event Engine Processing
       *
       * payment_success → Order Creation
       * user_register   → Customer Profile (next milestone)
       * ============================================================
       */
      const engine = processRetailEvent(event);

      return res.json({
        success: true,
        ledger,
        engine,
      });
    } catch (err: any) {
      console.error("Retail Event Engine Error:", err);

      return res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  },
);

/**
 * ============================================================
 * PUBLIC RETAIL READ ENDPOINTS (Frontend Sync)
 * ============================================================
 */

/**
 * Products Catalog
 *
 * Tenant Isolation Rule:
 * - Company scope required in real deployment
 * - Trial uses tenant-demo
 */
app.get("/api/retail/products", (req, res) => {
  const tenantId = (req.query.tenantId as string) || "tenant-demo";

  const products = retailRepo.listProducts(tenantId);

  return res.json({
    tenantId,
    products,
    syncedAt: new Date().toISOString(),
  });
});

/**
 * Orders Ledger
 */
app.get("/api/retail/orders", (req, res) => {
  const tenantId = (req.query.tenantId as string) || "tenant-demo";

  const orders = retailRepo.listOrders(tenantId);

  return res.json({
    tenantId,
    orders,
    syncedAt: new Date().toISOString(),
  });
});

/**
 * Inventory Catalog Bridge
 *
 * This proves:
 * - Zenvix inventory updates appear in ecommerce frontend
 */
app.get("/api/inventory/catalog", (req, res) => {
  const tenantId = (req.query.tenantId as string) || "tenant-demo";

  const products = mockInventoryRepo.listItems(tenantId);

  return res.json({
    tenantId,
    products,
    syncedAt: new Date().toISOString(),
  });
});

/**
 * ============================================================
 * SERVER START
 * ============================================================
 */

app.listen(PORT, () => {
  console.log(`🚀 Zenvix Backend Engine running on http://localhost:${PORT}`);
  console.log(`📂 Storage Mode: Node.js File System (.db/)`);
});
