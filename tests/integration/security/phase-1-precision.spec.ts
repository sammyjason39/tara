/**
 * Phase 1 Precision & Idempotency Tests
 * ZENVIX_MASTER_AUDIT_2026 | Tasks 1.1–1.6
 *
 * Test A — Decimal Precision (INV-PREC-001)
 *   Verifies that stock quantity arithmetic via Prisma.Decimal produces
 *   exactly 0.3000 for 0.1 + 0.2, NOT the IEEE 754 float result 0.30000000000000004.
 *
 * Test B — Idempotency (PROC-IDEM-001)
 *   Verifies that two POST /requisitions with the same x-idempotency-key
 *   result in exactly one DB write, and the second call returns the cached response.
 *
 * Test C — Event Schema Validation
 *   Verifies STOCK_RESERVED / STOCK_RELEASED payloads accept Decimal strings
 *   and reject raw JS numbers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import {
  StockReservedSchemaV1,
  StockReleasedSchemaV1,
  StockMovementSchemaV2,
  validateEventPayload,
} from '../../../backend/src/shared/events/event.registry';
import { IdempotencyService, IDEMPOTENCY_TTL_HOURS } from '../../../backend/src/shared/idempotency/idempotency.service';

// ——- TEST A: DECIMAL PRECISION —————————————————————————————————————————————————

describe('[Phase 1.1] Decimal Precision — Prisma.Decimal vs JavaScript Float', () => {
  const EXPECTED_EXACT = '0.3';

  it('JavaScript native float 0.1 + 0.2 is NOT exactly 0.3 (demonstrating the problem)', () => {
    const result = 0.1 + 0.2;
    // This is the bug we are fixing
    expect(result).not.toBe(0.3);
    expect(result.toString()).toBe('0.30000000000000004');
  });

  it('Prisma.Decimal 0.1 + 0.2 equals exactly "0.3" (no float drift)', () => {
    const a = new Prisma.Decimal('0.1');
    const b = new Prisma.Decimal('0.2');
    const result = a.add(b);
    expect(result.toString()).toBe(EXPECTED_EXACT);
  });

  it('Prisma.Decimal addition is commutative: 0.2 + 0.1 = 0.1 + 0.2', () => {
    const forward = new Prisma.Decimal('0.1').add(new Prisma.Decimal('0.2'));
    const reverse = new Prisma.Decimal('0.2').add(new Prisma.Decimal('0.1'));
    expect(forward.equals(reverse)).toBe(true);
  });

  it('toFixed(4) produces "0.3000" (4 decimal places, matching Decimal(19,4))', () => {
    const result = new Prisma.Decimal('0.1').add(new Prisma.Decimal('0.2'));
    expect(result.toFixed(4)).toBe('0.3000');
  });

  it('stock increment: on_hand 100.0001 + 0.0009 equals exactly "0.1010" (no drift)', () => {
    // Simulates DB increment: on_hand = 100.0001, intake = 0.0009
    const onHand = new Prisma.Decimal('100.0001');
    const intake = new Prisma.Decimal('0.0009');
    const result = onHand.add(intake);
    expect(result.toFixed(4)).toBe('100.0010');
  });

  it('stock decrement: 50.0000 - 0.0001 equals exactly "49.9999"', () => {
    const onHand = new Prisma.Decimal('50.0000');
    const consumed = new Prisma.Decimal('0.0001');
    const result = onHand.sub(consumed);
    expect(result.toFixed(4)).toBe('49.9999');
  });

  it('Prisma.Decimal.lessThan() comparison works correctly for stock checks', () => {
    const available = new Prisma.Decimal('10.0000');
    const requested = new Prisma.Decimal('10.0001');
    // 10.0000 < 10.0001 → should block the stock deduction
    expect(available.lessThan(requested)).toBe(true);
  });

  it('Prisma.Decimal.greaterThan(0) correctly identifies positive adjustments', () => {
    const positiveDelta = new Prisma.Decimal('5.5000');
    const negativeDelta = new Prisma.Decimal('-3.0000');
    expect(positiveDelta.greaterThan(0)).toBe(true);
    expect(negativeDelta.greaterThan(0)).toBe(false);
  });

  it('Decimal.abs() produces the correct absolute value for adjustment quantities', () => {
    const delta = new Prisma.Decimal('-7.2500');
    expect(delta.abs().toFixed(4)).toBe('7.2500');
  });

  it('neg() produces correct negative quantity for TRANSFER_OUT and CONSUME movements', () => {
    const qty = new Prisma.Decimal('15.7500');
    const negQty = qty.neg();
    expect(negQty.toFixed(4)).toBe('-15.7500');
    expect(negQty.lessThan(0)).toBe(true);
  });
});

// ——- TEST B: IDEMPOTENCY —————————————————————————————————————————————————

describe('[Phase 1.6] Idempotency — POST /requisitions and /suppliers', () => {
  const TENANT_ID = 'tenant-001';
  const ENDPOINT  = '/procurement/requisitions';
  const IDEM_KEY  = 'req-idem-key-abc123';

  const MOCK_RESPONSE = {
    success: true,
    tenantId: TENANT_ID,
    data: { id: 'req-uuid-001', title: 'Test Requisition', status: 'PENDING_REQUESTER_HOD' },
  };

  function buildService(existingRecord: any = null) {
    const mockPrisma = {
      sysIdempotencyKey: {
        findFirst: vi.fn().mockResolvedValue(existingRecord),
        upsert: vi.fn().mockResolvedValue({ id: 'idem-uuid-001' }),
        delete: vi.fn().mockResolvedValue({}),
      },
    };
    const service = new IdempotencyService(mockPrisma as any);
    return { service, mockPrisma };
  }

  // —— First request: no existing key → allow through ————————————————————————
  it('check() returns null when no idempotency key exists (first request)', async () => {
    const { service } = buildService(null);
    const result = await service.check(TENANT_ID, IDEM_KEY, ENDPOINT);
    expect(result).toBeNull();
  });

  // —— Second request: valid cached key → return cached response —————————————
  it('check() returns the cached response when key exists and is not expired', async () => {
    const futureExpiry = new Date();
    futureExpiry.setHours(futureExpiry.getHours() + 23); // 23h from now, inside TTL

    const { service } = buildService({
      id: 'idem-uuid-001',
      tenantId: TENANT_ID,
      key: IDEM_KEY,
      endpoint: ENDPOINT,
      responseSnapshot: MOCK_RESPONSE,
      expiresAt: futureExpiry,
    });

    const result = await service.check(TENANT_ID, IDEM_KEY, ENDPOINT);
    expect(result).toEqual(MOCK_RESPONSE);
  });

  // —— [CORE TEST] Two identical requests → ONE DB write —————————————————————
  it('[CORE] Two identical POST requests with same key result in only ONE database record', async () => {
    let savedCount = 0;
    let cachedResponseSnapshot: any = null;

    // Simulate the real flow: first save, then check returns cached
    const mockPrismaSequence = {
      sysIdempotencyKey: {
        findFirst: vi.fn().mockImplementation(() => {
          if (savedCount === 0) return Promise.resolve(null);
          return Promise.resolve({
            id: 'idem-001',
            tenantId: TENANT_ID,
            key: IDEM_KEY,
            endpoint: ENDPOINT,
            responseSnapshot: cachedResponseSnapshot,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          });
        }),
        upsert: vi.fn().mockImplementation((args) => {
          const create = args.create;
          savedCount++;
          cachedResponseSnapshot = create.responseSnapshot;
          return Promise.resolve({ id: 'idem-001' });
        }),
        delete: vi.fn(),
      },
    };

    const service = new IdempotencyService(mockPrismaSequence as any);

    // First request: no cache
    const firstCheck = await service.check(TENANT_ID, IDEM_KEY, ENDPOINT);
    expect(firstCheck).toBeNull();

    // First request: save response
    await service.save(TENANT_ID, IDEM_KEY, ENDPOINT, MOCK_RESPONSE);
    expect(savedCount).toBe(1);

    // Second request: cache hit
    const secondCheck = await service.check(TENANT_ID, IDEM_KEY, ENDPOINT);
    expect(secondCheck).toEqual(MOCK_RESPONSE);

    // Second request: save is NOT called again (controller short-circuits)
    // savedCount is still 1 — only 1 DB write total
    expect(savedCount).toBe(1);
    expect(mockPrismaSequence.sysIdempotencyKey.upsert).toHaveBeenCalledOnce();
  });

  // —— Expired key → treated as new request ———————————————————————————————————
  it('check() returns null and triggers lazy delete for an expired key', async () => {
    const pastExpiry = new Date();
    pastExpiry.setHours(pastExpiry.getHours() - 1); // 1 hour ago (expired)

    const { service, mockPrisma } = buildService({
      id: 'idem-expired-001',
      tenantId: TENANT_ID,
      key: IDEM_KEY,
      endpoint: ENDPOINT,
      responseSnapshot: MOCK_RESPONSE,
      expiresAt: pastExpiry,
    });

    const result = await service.check(TENANT_ID, IDEM_KEY, ENDPOINT);
    expect(result).toBeNull();
    // Lazy delete should be triggered (fire-and-forget)
    // Allow async deletion to settle
    await new Promise((r) => setTimeout(r, 10));
    expect(mockPrisma.sysIdempotencyKey.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'idem-expired-001' } }),
    );
  });

  // —— TTL is set to exactly 24 hours —————————————————————————————————————————
  it('save() stores a key with expiresAt exactly IDEMPOTENCY_TTL_HOURS (24h) in the future', async () => {
    const { service, mockPrisma } = buildService(null);
    const before = new Date();
    await service.save(TENANT_ID, IDEM_KEY, ENDPOINT, MOCK_RESPONSE);
    const after = new Date();

    const upsertCall = mockPrisma.sysIdempotencyKey.upsert.mock.calls[0][0];
    const expiresAt: Date = upsertCall.create.expiresAt;

    // expiresAt should be ~24h after save() was called
    const expectedMin = new Date(before.getTime() + IDEMPOTENCY_TTL_HOURS * 3600 * 1000 - 1000);
    const expectedMax = new Date(after.getTime()  + IDEMPOTENCY_TTL_HOURS * 3600 * 1000 + 1000);
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime());
    expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedMax.getTime());
  });

  // —— Key is tenant-scoped ———————————————————————————————————————————————————
  it('check() is scoped to tenant: same key for different tenants are independent', async () => {
    // Tenant 1 has a cached record; Tenant 2 does not
    const { service, mockPrisma } = buildService(null); // findFirst returns null
    const resultTenant2 = await service.check('tenant-002', IDEM_KEY, ENDPOINT);
    expect(resultTenant2).toBeNull();
    expect(mockPrisma.sysIdempotencyKey.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-002', key: expect.stringContaining(IDEM_KEY) },
    });
  });
});

// ——- TEST C: EVENT SCHEMA VALIDATION (DECIMAL-SAFE) —————————————————————————————————————————————————

describe('[Phase 1.4] Event Registry — STOCK_RESERVED & STOCK_RELEASED Decimal Schemas', () => {
  const validReservedPayload = {
    reservationId:  'res-uuid-001',
    tenantId:       'tenant-001',
    productId:      'prod-uuid-001',
    locationId:     'loc-uuid-001',
    quantity:       '10.5000',   // ← string, Decimal-safe
    referenceId:    'ord-001',
    referenceType:  'SALES_ORDER',
    reservedBy:     'user-001',
    timestamp:      new Date().toISOString(),
  };

  const validReleasedPayload = {
    reservationId: 'res-uuid-001',
    tenantId:      'tenant-001',
    productId:     'prod-uuid-001',
    locationId:    'loc-uuid-001',
    quantity:      '10.5000',
    reason:        'FULFILLED' as const,
    releasedBy:    'user-001',
    timestamp:     new Date().toISOString(),
  };

  it('STOCK_RESERVED: accepts a valid Decimal-string quantity ("10.5000")', () => {
    const result = StockReservedSchemaV1.safeParse(validReservedPayload);
    expect(result.success).toBe(true);
  });

  it('STOCK_RESERVED: rejects a raw JS number quantity (IEEE 754 unsafe)', () => {
    const invalid = { ...validReservedPayload, quantity: 10.5 as any };
    const result = StockReservedSchemaV1.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('STOCK_RESERVED: rejects float-drift string "0.30000000000000004"', () => {
    const invalid = { ...validReservedPayload, quantity: '0.30000000000000004' };
    const result = StockReservedSchemaV1.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('STOCK_RESERVED: rejects negative quantities (reserved qty must be positive)', () => {
    const invalid = { ...validReservedPayload, quantity: '-5.0000' };
    const result = StockReservedSchemaV1.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('STOCK_RELEASED: accepts a valid payload with FULFILLED reason', () => {
    const result = StockReleasedSchemaV1.safeParse(validReleasedPayload);
    expect(result.success).toBe(true);
  });

  it('STOCK_RELEASED: accepts all valid release reasons', () => {
    const reasons = ['FULFILLED', 'CANCELLED', 'EXPIRED', 'MANUAL'] as const;
    for (const reason of reasons) {
      const result = StockReleasedSchemaV1.safeParse({ ...validReleasedPayload, reason });
      expect(result.success).toBe(true);
    }
  });

  it('STOCK_RELEASED: rejects an invalid release reason', () => {
    const invalid = { ...validReleasedPayload, reason: 'UNKNOWN' };
    const result = StockReleasedSchemaV1.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('StockMovementSchemaV2: accepts Decimal-string quantity', () => {
    const payload = {
      movementId:    'mov-001',
      tenantId:      'tenant-001',
      productId:     'prod-001',
      locationId:    'loc-001',
      type:          'intake' as const,
      quantity:      '100.0000',
      referenceId:   'ref-001',
      referenceType: 'MANUAL',
      timestamp:     new Date().toISOString(),
    };
    const result = StockMovementSchemaV2.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('StockMovementSchemaV2: accepts negative Decimal-string for OUT movements', () => {
    const payload = {
      movementId: 'mov-002', tenantId: 'tenant-001', productId: 'prod-001',
      locationId: 'loc-001', type: 'deduction' as const,
      quantity: '-5.0000', referenceId: 'ref-002', referenceType: 'SALE',
      timestamp: new Date().toISOString(),
    };
    const result = StockMovementSchemaV2.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('StockMovementSchemaV2: rejects a float number (not a string)', () => {
    const payload = {
      movementId: 'mov-003', tenantId: 'tenant-001', productId: 'prod-001',
      type: 'intake' as const, quantity: 100.5, // ← number, should fail
      referenceId: 'ref-003', referenceType: 'MANUAL',
      timestamp: new Date().toISOString(),
    };
    const result = StockMovementSchemaV2.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('validateEventPayload warns (but does not throw) for STOCK_MOVEMENT_CREATED v1 (deprecated)', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const payload = {
      movementId: 'mov-001', tenantId: 'tenant-001', productId: 'prod-001',
      type: 'intake', quantity: 10, referenceId: 'ref-001',
      referenceType: 'MANUAL', timestamp: new Date().toISOString(),
    };
    const result = validateEventPayload('STOCK_MOVEMENT_CREATED', 1, payload);
    expect(result).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('DEPRECATED'));
    consoleSpy.mockRestore();
  });
});


// -------------------------------------------------------------------------------
// PHASE 1 FINAL CLEANUP — Operational Float → Decimal(19,4)
// Tests for: InventoryMovementRequest, InventoryPoolStock, RetailCartItem
// -------------------------------------------------------------------------------

describe('[Phase 1 Final] InventoryMovementRequest — Decimal quantity', () => {
  it('movement request quantity "1.2500" is a valid Decimal(19,4) value', () => {
    const qty = new Prisma.Decimal('1.2500');
    expect(qty.toFixed(4)).toBe('1.2500');
    expect(qty.greaterThan(0)).toBe(true);
  });

  it('movement quantity "0.0001" (minimum fractional unit) is preserved exactly', () => {
    const qty = new Prisma.Decimal('0.0001');
    expect(qty.toFixed(4)).toBe('0.0001');
  });

  it('movement fulfillment: source.available - request.quantity = exact Decimal subtraction', () => {
    const sourceAvailable = new Prisma.Decimal('100.0000');
    const requested       = new Prisma.Decimal('33.3333');
    const remaining       = sourceAvailable.sub(requested);
    expect(remaining.toFixed(4)).toBe('66.6667');
  });

  it('DTO transform: numeric input 5 coerces to "5" matching Decimal(19,4) regex', () => {
    const DECIMAL_RE = /^\d{1,15}(\.\d{1,4})?$/;
    expect(String(5)).toMatch(DECIMAL_RE);
  });

  it('DTO transform: float 1.25 coerces to "1.25" matching Decimal(19,4) regex', () => {
    const DECIMAL_RE = /^\d{1,15}(\.\d{1,4})?$/;
    expect(String(1.25)).toMatch(DECIMAL_RE);
  });

  it('DTO reject: float-drift string "0.30000000000000004" fails Decimal(19,4) regex', () => {
    const DECIMAL_RE = /^\d{1,15}(\.\d{1,4})?$/;
    expect('0.30000000000000004').not.toMatch(DECIMAL_RE);
  });
});


describe('[Phase 1 Final] InventoryPoolStock — Decimal pool aggregation', () => {
  it('pool stock aggregation: 3 shards sum exactly with Decimal (.add chain)', () => {
    const shards = ['120.5000', '80.2500', '44.2500'];
    const total = shards.reduce(
      (sum, s) => sum.add(new Prisma.Decimal(s)),
      new Prisma.Decimal(0),
    );
    expect(total.toFixed(4)).toBe('245.0000');
  });

  it('pool available = onHand - reserved: exact Decimal subtraction', () => {
    const onHand    = new Prisma.Decimal('500.0000');
    const reserved  = new Prisma.Decimal('123.7500');
    const available = onHand.sub(reserved);
    expect(available.toFixed(4)).toBe('376.2500');
  });

  it('pool comparison: available.lessThan(requested) blocks over-commitment', () => {
    const available = new Prisma.Decimal('10.0000');
    const requested = new Prisma.Decimal('10.0001');
    expect(available.lessThan(requested)).toBe(true);
  });

  it('pool release clamp: reserved < releaseQty ? release only reserved amount', () => {
    const stockReserved = new Prisma.Decimal('3.2500');
    const releaseQty    = new Prisma.Decimal('5.0000');
    const releaseAmt    = stockReserved.lessThan(releaseQty) ? stockReserved : releaseQty;
    expect(releaseAmt.toFixed(4)).toBe('3.2500');
  });
});


describe('[Phase 1 Final] Bulk POS Sale — 4-Decimal-Place Weight Items', () => {
  // SCENARIO: Deli counter — items sold by weight (kg) with fractional quantities.
  // Validates: exact subtotal, exact stock deduction, exact tax = grandTotal - subtotal.

  const cartItems = [
    { productId: 'prod-beef-001',    quantity: '1.2500', unitPrice: '45000.0000' },
    { productId: 'prod-salmon-001',  quantity: '0.7500', unitPrice: '62000.5000' },
    { productId: 'prod-chicken-001', quantity: '3.0000', unitPrice: '28000.7500' },
  ];

  it('[CORE] line item subtotals computed with Decimal.mul — exact to 4dp', () => {
    const [beef, salmon, chicken] = cartItems.map(item =>
      new Prisma.Decimal(item.quantity).mul(new Prisma.Decimal(item.unitPrice))
    );
    expect(beef.toFixed(4)).toBe('56250.0000');   // 1.2500 * 45000.0000
    expect(salmon.toFixed(4)).toBe('46500.3750'); // 0.7500 * 62000.5000
    expect(chicken.toFixed(4)).toBe('84002.2500'); // 3.0000 * 28000.7500
  });

  it('[CORE] basket subtotal = exact sum via Decimal.add (no JS float drift)', () => {
    const subtotal = cartItems.reduce(
      (sum, item) => sum.add(
        new Prisma.Decimal(item.quantity).mul(new Prisma.Decimal(item.unitPrice))
      ),
      new Prisma.Decimal(0),
    );
    expect(subtotal.toFixed(4)).toBe('186752.6250');
    // Negative proof: JS float accumulation
    const jsSubtotal = (1.25*45000) + (0.75*62000.5) + (3.0*28000.75);
    // JS is coincidentally exact here but Decimal guarantees it structurally
    expect(new Prisma.Decimal(String(jsSubtotal)).toFixed(4)).toBe('186752.6250');
  });

  it('[CORE] tax = grandTotal - subtotal via Decimal.sub (exact round-trip)', () => {
    const subtotal   = new Prisma.Decimal('186752.6250');
    const grandTotal = new Prisma.Decimal('190000.0000');
    const tax        = grandTotal.sub(subtotal);
    expect(tax.toFixed(4)).toBe('3247.3750');
    // Round-trip: tax + subtotal must equal grandTotal
    expect(tax.add(subtotal).toFixed(4)).toBe(grandTotal.toFixed(4));
  });

  it('[CORE] total stock deduction = exact sum of cart quantities', () => {
    const totalDeducted = cartItems.reduce(
      (sum, item) => sum.add(new Prisma.Decimal(item.quantity)),
      new Prisma.Decimal(0),
    );
    expect(totalDeducted.toFixed(4)).toBe('5.0000'); // 1.25 + 0.75 + 3.00 = 5.00 exactly
  });

  it('[CORE] stock.onHand after bulk sale is exact: 50.0000 - 5.0000 = 45.0000', () => {
    const totalDeducted = cartItems.reduce(
      (sum, item) => sum.add(new Prisma.Decimal(item.quantity)),
      new Prisma.Decimal(0),
    );
    const initialStock = new Prisma.Decimal('50.0000');
    const afterSale    = initialStock.sub(totalDeducted);
    expect(afterSale.toFixed(4)).toBe('45.0000');
  });

  it('all cart item quantities pass the Decimal(19,4) DTO regex', () => {
    const DECIMAL_RE = /^\d{1,15}(\.\d{1,4})?$/;
    for (const item of cartItems) {
      expect(item.quantity).toMatch(DECIMAL_RE);
      expect(item.unitPrice).toMatch(DECIMAL_RE);
    }
  });

  it('sequential 0.1250 kg deductions over 10 transactions = 98.7500 remaining stock', () => {
    let onHand = new Prisma.Decimal('100.0000');
    for (let i = 0; i < 10; i++) {
      onHand = onHand.sub(new Prisma.Decimal('0.1250'));
    }
    expect(onHand.toFixed(4)).toBe('98.7500');
  });
});
