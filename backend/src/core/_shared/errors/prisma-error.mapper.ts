import {
  BadRequestException,
  ConflictException,
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

/**
 * Typed error surface shared by the five core operational modules
 * (IT, Procurement, Sales, Marketing, Payment).
 *
 * Goal (Requirements 1.1, 1.2, 1.3, 1.4, 7.3): no validation, lookup, or
 * business-rule failure should ever escape as an unintended HTTP 500. Service
 * and repository code throws the NestJS HTTP exceptions re-exported below
 * instead of bare `throw new Error(...)`, and Prisma errors are mapped to the
 * correct 4xx status by {@link mapPrismaError}.
 *
 * Prisma error code mapping (design "Error Handling"):
 *   - P2025 (record not found)            -> 404 NotFoundException
 *   - P2002 (unique constraint violation) -> 409 ConflictException
 *   - P2003 (foreign key violation)       -> 400 BadRequestException
 *   - P2000 (value too long for column)   -> 400 BadRequestException
 *   - anything else                       -> log then 500 (last resort only)
 *
 * This mirrors the discipline established by the parallel HR stabilization
 * effort (`core/hr/utils/hr-prisma.errors.ts`) so that all core modules surface
 * failures the same way.
 */

const logger = new Logger("CorePrismaErrors");

/**
 * The set of NestJS HTTP exceptions that the core modules use as their typed
 * error surface. Importing from here keeps the discipline visible and
 * consistent and makes the intended status-code mapping explicit at every
 * throw site:
 *
 *   - {@link BadRequestException}  -> 400 (validation / invalid transition / bad reference)
 *   - {@link ForbiddenException}   -> 403 (role gate / foreign scope)
 *   - {@link NotFoundException}    -> 404 (resource missing within Tenant_Scope)
 *   - {@link ConflictException}    -> 409 (unique constraint / duplicate)
 */
export {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";

/**
 * Maps a Prisma known-request error to the appropriate NestJS HTTP exception.
 *
 * - Returns a typed 4xx exception for the mapped Prisma codes.
 * - Returns `null` for anything that is not a recognised Prisma error, so the
 *   caller can decide whether to rethrow an already-typed `HttpException` or
 *   fall back to a logged 500.
 */
export function prismaErrorToHttpException(
  error: unknown,
  context?: string,
): HttpException | null {
  if (!(error instanceof PrismaClientKnownRequestError)) {
    return null;
  }

  const prefix = context ? `[${context}] ` : "";

  switch (error.code) {
    case "P2025": {
      // An operation failed because it depends on one or more records that were
      // required but not found. Surfaces cross-tenant ids as 404, never leakage.
      return new NotFoundException(
        `${prefix}Record not found or already deleted.`,
      );
    }
    case "P2002": {
      // Unique constraint failed.
      const target = formatTarget(error.meta?.target);
      return new ConflictException(
        `${prefix}A record with the same ${target} already exists.`,
      );
    }
    case "P2003": {
      // Foreign key constraint failed.
      const field = (error.meta?.field_name as string) ?? "unknown field";
      return new BadRequestException(
        `${prefix}Invalid reference: '${field}' points to a non-existent record.`,
      );
    }
    case "P2000": {
      // The provided value for the column is too long for the column's type.
      const column = (error.meta?.column_name as string) ?? "a field";
      return new BadRequestException(
        `${prefix}The value provided for '${column}' is too long.`,
      );
    }
    default:
      return null;
  }
}

/**
 * Central catch-block handler. Call from
 * `catch (error) { mapPrismaError(error, "Entity"); }`.
 *
 * Resolution order:
 *   1. If the error is a mappable Prisma error -> throw the mapped 4xx exception.
 *   2. If the error is already a NestJS `HttpException` -> rethrow it unchanged
 *      (preserves 400/403/404/409 raised deliberately upstream).
 *   3. Otherwise -> log the unexpected error and throw a 500 as a last resort.
 */
export function mapPrismaError(error: unknown, context?: string): never {
  const mapped = prismaErrorToHttpException(error, context);
  if (mapped) {
    throw mapped;
  }

  if (error instanceof HttpException) {
    throw error;
  }

  const prefix = context ? `[${context}] ` : "";
  logger.error(
    `${prefix}Unexpected error mapped to 500: ${
      error instanceof Error ? error.message : String(error)
    }`,
    error instanceof Error ? error.stack : undefined,
  );
  throw new InternalServerErrorException(
    `${prefix}An unexpected error occurred while processing the request.`,
  );
}

function formatTarget(target: unknown): string {
  if (Array.isArray(target)) {
    return target.join(", ");
  }
  if (typeof target === "string") {
    return target;
  }
  return "value";
}
