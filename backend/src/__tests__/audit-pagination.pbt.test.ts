/**
 * Property-Based Tests for Pagination Offset Correctness and Metadata Consistency.
 *
 * Uses fast-check (fc.assert / fc.property) with vitest.
 * Each property runs a minimum of 100 iterations.
 *
 * Feature: full-module-production-audit, Property 4: Pagination Offset Correctness
 */

import { describe, test, expect } from "vitest";
import * as fc from "fast-check";
import { BadRequestException } from "@nestjs/common";
import { PaginationPipe, PaginationParams } from "../shared/pipes/pagination.pipe";

// ─── Helper: Simulate paginated response metadata ───────────────────────────

/**
 * Given valid pagination params and a total count, compute the paginated response
 * metadata as a controller would.
 */
function computePaginationMetadata(params: PaginationParams, totalCount: number) {
  const offset = (params.page - 1) * params.pageSize;
  const totalPages = Math.ceil(totalCount / params.pageSize);
  // The actual result size is capped by pageSize and remaining items
  const remainingItems = Math.max(0, totalCount - offset);
  const resultSize = Math.min(params.pageSize, remainingItems);

  return {
    offset,
    totalPages,
    resultSize,
    currentPage: params.page,
    pageSize: params.pageSize,
  };
}

// ─── Property 4: Pagination Offset Correctness and Metadata Consistency ─────
// Feature: full-module-production-audit, Property 4: Pagination Offset Correctness

describe("Property 4: Pagination Offset Correctness and Metadata Consistency", () => {
  /**
   * Validates: Requirements 11.1, 11.3, 11.4, 11.5
   */

  const pipe = new PaginationPipe();

  describe("Valid pagination parameters", () => {
    test("offset = (page - 1) × pageSize for any valid page ≥ 1 and 1 ≤ pageSize ≤ 200", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }),  // page
          fc.integer({ min: 1, max: 200 }),     // pageSize
          (page, pageSize) => {
            const params = pipe.transform({ page: String(page), pageSize: String(pageSize) });

            const offset = (params.page - 1) * params.pageSize;

            expect(offset).toBe((page - 1) * pageSize);
            expect(params.page).toBe(page);
            expect(params.pageSize).toBe(pageSize);
          }
        ),
        { numRuns: 100 }
      );
    });

    test("result size ≤ pageSize for any valid pagination with arbitrary totalCount", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }),   // page
          fc.integer({ min: 1, max: 200 }),      // pageSize
          fc.integer({ min: 0, max: 100000 }),   // totalCount
          (page, pageSize, totalCount) => {
            const params = pipe.transform({ page: String(page), pageSize: String(pageSize) });
            const metadata = computePaginationMetadata(params, totalCount);

            expect(metadata.resultSize).toBeLessThanOrEqual(params.pageSize);
            expect(metadata.resultSize).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test("totalPages = ceil(totalCount / pageSize) for any valid pagination", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }),   // page
          fc.integer({ min: 1, max: 200 }),      // pageSize
          fc.integer({ min: 0, max: 100000 }),   // totalCount
          (page, pageSize, totalCount) => {
            const params = pipe.transform({ page: String(page), pageSize: String(pageSize) });
            const metadata = computePaginationMetadata(params, totalCount);

            const expectedTotalPages = Math.ceil(totalCount / params.pageSize);
            expect(metadata.totalPages).toBe(expectedTotalPages);
          }
        ),
        { numRuns: 100 }
      );
    });

    test("currentPage in metadata matches the requested page", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }),   // page
          fc.integer({ min: 1, max: 200 }),      // pageSize
          fc.integer({ min: 0, max: 100000 }),   // totalCount
          (page, pageSize, totalCount) => {
            const params = pipe.transform({ page: String(page), pageSize: String(pageSize) });
            const metadata = computePaginationMetadata(params, totalCount);

            expect(metadata.currentPage).toBe(page);
          }
        ),
        { numRuns: 100 }
      );
    });

    test("offset is always non-negative for valid page ≥ 1", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }),
          fc.integer({ min: 1, max: 200 }),
          (page, pageSize) => {
            const params = pipe.transform({ page: String(page), pageSize: String(pageSize) });
            const offset = (params.page - 1) * params.pageSize;

            expect(offset).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Invalid pagination parameters → validation error", () => {
    test("page < 1 throws BadRequestException", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -1000, max: 0 }),  // invalid page (< 1)
          fc.integer({ min: 1, max: 200 }),     // valid pageSize
          (page, pageSize) => {
            expect(() => pipe.transform({ page: String(page), pageSize: String(pageSize) }))
              .toThrow(BadRequestException);
          }
        ),
        { numRuns: 100 }
      );
    });

    test("pageSize < 1 throws BadRequestException", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }),   // valid page
          fc.integer({ min: -1000, max: 0 }),    // invalid pageSize (< 1)
          (page, pageSize) => {
            expect(() => pipe.transform({ page: String(page), pageSize: String(pageSize) }))
              .toThrow(BadRequestException);
          }
        ),
        { numRuns: 100 }
      );
    });

    test("pageSize > 200 throws BadRequestException", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }),   // valid page
          fc.integer({ min: 201, max: 10000 }), // invalid pageSize (> 200)
          (page, pageSize) => {
            expect(() => pipe.transform({ page: String(page), pageSize: String(pageSize) }))
              .toThrow(BadRequestException);
          }
        ),
        { numRuns: 100 }
      );
    });

    test("non-numeric page throws BadRequestException", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 10 }).filter((s) => isNaN(Number(s))),
          fc.integer({ min: 1, max: 200 }),
          (invalidPage, pageSize) => {
            expect(() => pipe.transform({ page: invalidPage, pageSize: String(pageSize) }))
              .toThrow(BadRequestException);
          }
        ),
        { numRuns: 100 }
      );
    });

    test("non-numeric pageSize throws BadRequestException", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }),
          fc.string({ minLength: 1, maxLength: 10 }).filter((s) => isNaN(Number(s))),
          (page, invalidPageSize) => {
            expect(() => pipe.transform({ page: String(page), pageSize: invalidPageSize }))
              .toThrow(BadRequestException);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
