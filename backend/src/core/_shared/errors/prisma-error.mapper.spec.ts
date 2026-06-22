import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import {
  mapPrismaError,
  prismaErrorToHttpException,
} from "./prisma-error.mapper";

/**
 * Tests for the shared typed error surface and Prisma error-mapping layer
 * (Requirements 1.1, 1.2, 1.3, 1.4, 7.3).
 *
 * No validation, lookup, or business-rule failure should ever escape as an
 * unintended HTTP 500: known Prisma codes map to 4xx and deliberately-raised
 * HttpExceptions are preserved.
 */

function makePrismaError(code: string, meta?: Record<string, unknown>) {
  return new PrismaClientKnownRequestError("prisma failure", {
    code,
    clientVersion: "6.2.1",
    meta,
  });
}

describe("prismaErrorToHttpException", () => {
  it("maps P2025 (record not found) to 404 NotFoundException", () => {
    const mapped = prismaErrorToHttpException(makePrismaError("P2025"), "IT");
    expect(mapped).toBeInstanceOf(NotFoundException);
    expect((mapped as HttpException).getStatus()).toBe(404);
  });

  it("maps P2002 (unique constraint) to 409 ConflictException naming the target", () => {
    const mapped = prismaErrorToHttpException(
      makePrismaError("P2002", { target: ["device_code", "tenant_id"] }),
      "IT",
    );
    expect(mapped).toBeInstanceOf(ConflictException);
    expect((mapped as HttpException).getStatus()).toBe(409);
    expect((mapped as HttpException).message).toContain("device_code");
  });

  it("maps P2003 (foreign key) to 400 BadRequestException naming the field", () => {
    const mapped = prismaErrorToHttpException(
      makePrismaError("P2003", { field_name: "supplier_id" }),
      "Procurement",
    );
    expect(mapped).toBeInstanceOf(BadRequestException);
    expect((mapped as HttpException).getStatus()).toBe(400);
    expect((mapped as HttpException).message).toContain("supplier_id");
  });

  it("maps P2000 (value too long) to 400 BadRequestException naming the column", () => {
    const mapped = prismaErrorToHttpException(
      makePrismaError("P2000", { column_name: "name" }),
      "Sales",
    );
    expect(mapped).toBeInstanceOf(BadRequestException);
    expect((mapped as HttpException).getStatus()).toBe(400);
    expect((mapped as HttpException).message).toContain("name");
  });

  it("returns null for an unrecognised Prisma code", () => {
    expect(prismaErrorToHttpException(makePrismaError("P2010"))).toBeNull();
  });

  it("returns null for a non-Prisma error", () => {
    expect(prismaErrorToHttpException(new Error("boom"))).toBeNull();
    expect(prismaErrorToHttpException("not an error")).toBeNull();
  });

  it("prefixes the message with the supplied context", () => {
    const mapped = prismaErrorToHttpException(makePrismaError("P2025"), "Payment");
    expect((mapped as HttpException).message).toContain("[Payment]");
  });
});

describe("mapPrismaError", () => {
  it("throws the mapped 4xx exception for known Prisma codes (never 500)", () => {
    const cases: Array<[string, number]> = [
      ["P2025", 404],
      ["P2002", 400 + 9], // 409
      ["P2003", 400],
      ["P2000", 400],
    ];
    for (const [code, status] of cases) {
      let caught: unknown;
      try {
        mapPrismaError(makePrismaError(code), "Core");
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(HttpException);
      expect((caught as HttpException).getStatus()).toBe(status);
      expect((caught as HttpException).getStatus()).toBeLessThan(500);
    }
  });

  it("preserves an already-typed HttpException without widening it to 500", () => {
    for (const ex of [
      new BadRequestException("bad input"),
      new NotFoundException("missing"),
      new ForbiddenException("forbidden"),
      new ConflictException("conflict"),
    ]) {
      let caught: unknown;
      try {
        mapPrismaError(ex, "Core");
      } catch (e) {
        caught = e;
      }
      expect(caught).toBe(ex);
      expect((caught as HttpException).getStatus()).toBeLessThan(500);
    }
  });

  it("falls back to a logged 500 only for truly unexpected errors", () => {
    let caught: unknown;
    try {
      mapPrismaError(new Error("unexpected"), "Core");
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(InternalServerErrorException);
    expect((caught as HttpException).getStatus()).toBe(500);
  });

  // Feature: core-departments-stabilization
  // Property: known Prisma codes always resolve to a typed 4xx exception, never a 500.
  it("property: every mapped Prisma code resolves to a 4xx, never a 5xx", () => {
    const expectedStatus: Record<string, number> = {
      P2025: 404,
      P2002: 409,
      P2003: 400,
      P2000: 400,
    };

    fc.assert(
      fc.property(
        fc.constantFrom("P2025", "P2002", "P2003", "P2000"),
        fc.string({ maxLength: 24 }),
        fc.string({ minLength: 1, maxLength: 16 }),
        (code, context, metaValue) => {
          const error = makePrismaError(code, {
            target: [metaValue],
            field_name: metaValue,
            column_name: metaValue,
          });

          const mapped = prismaErrorToHttpException(error, context);
          expect(mapped).toBeInstanceOf(HttpException);
          const status = (mapped as HttpException).getStatus();
          expect(status).toBe(expectedStatus[code]);
          expect(status).toBeGreaterThanOrEqual(400);
          expect(status).toBeLessThan(500);

          let caught: unknown;
          try {
            mapPrismaError(error, context);
          } catch (e) {
            caught = e;
          }
          expect(caught).toBeInstanceOf(HttpException);
          expect((caught as HttpException).getStatus()).toBe(
            expectedStatus[code],
          );
        },
      ),
      { numRuns: 150 },
    );
  });
});
