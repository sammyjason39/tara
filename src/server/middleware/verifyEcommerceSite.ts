// src/server/middleware/verifyEcommerceSite.ts

import { Request, Response, NextFunction } from "express";
import { ecommerceConnectorRepo } from "@/core/repositories/retail/ecommerceConnectorRepo";

/**
 * verifyEcommerceSite (LOCKED)
 *
 * Purpose:
 * - Authenticate ecommerce website requests into Zenvix Retail
 * - Enforce strict tenant isolation:
 *
 *   Company A cannot see Company B
 *   Branch A cannot see Branch B
 *   Ecommerce A cannot see Ecommerce B
 *
 * Rule:
 * - Ecommerce never sends scope manually
 * - Zenvix injects scope after verification
 *
 * Required Header:
 * - x-ecommerce-key: <api-key>
 *
 * Output:
 * - req.ecommerceScope is guaranteed trusted
 */

export function verifyEcommerceSite(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    // ============================================================
    // 1. Extract API Key
    // ============================================================
    const apiKey = req.headers["x-ecommerce-key"];

    if (!apiKey || typeof apiKey !== "string") {
      return res.status(401).json({
        error: "Missing Ecommerce API Key",
        requiredHeader: "x-ecommerce-key",
      });
    }

    // ============================================================
    // 2. Lookup Connector Record
    // ============================================================
    const connector = ecommerceConnectorRepo.findByApiKey(apiKey);

    if (!connector) {
      return res.status(403).json({
        error: "Invalid Ecommerce API Key",
      });
    }

    // ============================================================
    // 3. Freeze Enforcement
    // ============================================================
    if (connector.status !== "active") {
      return res.status(403).json({
        error: "Ecommerce site is frozen",
        ecommerceId: connector.id,
      });
    }

    // ============================================================
    // 4. Hard Scope Enforcement (LOCKED)
    // ============================================================
    if (!connector.companyId) {
      return res.status(500).json({
        error: "Connector missing company scope (invalid configuration)",
      });
    }

    // ============================================================
    // 5. Attach Trusted Scope to Request
    // ============================================================
    ;(req as any).ecommerceScope = {
      ecommerceId: connector.id,
      companyId: connector.companyId,
      branchId: connector.branchId,
      domain: connector.domain,
      status: connector.status,
    };

    // ============================================================
    // 6. Block Scope Injection by Client (SECURITY)
    // ============================================================
    if (req.body?.scope) {
      delete req.body.scope;
    }

    next();
  } catch (err) {
    console.error("verifyEcommerceSite Middleware Error:", err);

    return res.status(500).json({
      error: "Internal Ecommerce Verification Failure",
    });
  }
}
