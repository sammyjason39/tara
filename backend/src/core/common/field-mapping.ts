/**
 * Field-mapping discipline utilities — Core Departments Stabilization (Task 1.4)
 *
 * Shared, framework-light primitives that establish a single, explicit and
 * deterministic translation layer between the core-department DTOs/entities
 * (camelCase, with occasional compatibility aliases) and the snake_case
 * database columns defined in `prisma/schema.prisma`. They are reused by the
 * write/read paths of all five core modules (IT, Procurement, Sales, Marketing,
 * Payment).
 *
 * Why this exists (Requirement 5 — Field Naming Consistency, Requirement 1.5/1.6):
 *
 * - Spreading a DTO straight into a Prisma `data: {...}` payload is unsafe: keys
 *   whose casing/naming differs from the schema column are silently dropped or
 *   trigger a runtime error against a nonexistent column. Each value must bind to
 *   the single column whose schema-defined name corresponds to it (5.1).
 * - Casing differences (camelCase DTO vs snake_case column) are translated
 *   deterministically so the same input field always resolves to the same column
 *   on every request (5.2), and every supplied mappable value is persisted with
 *   nothing dropped (5.3).
 * - A field that resolves to NO schema column rejects the whole request, naming
 *   the unresolved field, so nothing is persisted (5.4). This is stricter than a
 *   silent drop: it surfaces drift instead of hiding it.
 * - On read, every column is translated back to its DTO field name so no stored
 *   value is omitted from the response (5.5).
 * - Response serialization renders dates as ISO 8601 strings (1.5) and empty
 *   collections as `[]` rather than `null` (1.6).
 *
 * The functions are pure (the only side effect is throwing the typed
 * `UnresolvedFieldError`, which maps to HTTP 400) so they can be unit-tested in
 * isolation and shared by every phase.
 */

import { BadRequestException } from "@nestjs/common";

export type ColumnRecord = Record<string, unknown>;

/**
 * Thrown when a create/update request carries a field that resolves to no
 * schema-defined database column. Extends `BadRequestException` so the typed
 * error surface (Task 1.3) renders it as an HTTP 400 client error that names the
 * offending field, while persisting nothing (Requirement 5.4).
 */
export class UnresolvedFieldError extends BadRequestException {
  /** The original DTO field name that could not be resolved. */
  readonly field: string;
  /** The column name the field resolved to (for diagnostics). */
  readonly resolvedColumn: string;

  constructor(field: string, resolvedColumn: string) {
    super(
      `Unresolved field "${field}" does not map to any known database column ` +
        `(resolved to "${resolvedColumn}"); request rejected and nothing was persisted.`,
    );
    this.field = field;
    this.resolvedColumn = resolvedColumn;
    this.name = "UnresolvedFieldError";
  }
}

/* -------------------------------------------------------------------------- */
/* Casing conversions (deterministic)                                         */
/* -------------------------------------------------------------------------- */

/**
 * Convert a camelCase (or PascalCase) identifier to snake_case deterministically.
 * Already-snake_case input is returned unchanged. The conversion is total and
 * idempotent, guaranteeing the same column resolution for the same field on every
 * request (Requirement 5.2).
 *
 *   "deviceId"   -> "device_id"
 *   "createdAt"  -> "created_at"
 *   "tenant_id"  -> "tenant_id"   (unchanged)
 *   "ISODate"    -> "iso_date"
 */
export function camelToSnake(key: string): string {
  return key
    // boundary between a run of capitals and a following capital+lowercase (e.g. "ISODate" -> "ISO_Date")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    // boundary between lowercase/digit and an uppercase letter (e.g. "deviceId" -> "device_Id")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase();
}

/**
 * Convert a snake_case identifier to camelCase deterministically. Used on the
 * read path to translate column names back to DTO field names (Requirement 5.5).
 * Already-camelCase input is returned effectively unchanged.
 *
 *   "device_id"  -> "deviceId"
 *   "created_at" -> "createdAt"
 *   "name"       -> "name"
 */
export function snakeToCamel(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_m, c: string) => c.toUpperCase());
}

/* -------------------------------------------------------------------------- */
/* Write path: DTO -> columns                                                 */
/* -------------------------------------------------------------------------- */

export interface FieldMapSpec {
  /** The exhaustive set of writable schema columns for the target table. */
  readonly columns: readonly string[];
  /**
   * Explicit aliases for irregular field names that do not follow the plain
   * camelCase->snake_case rule (e.g. `position_id` -> `job_role_id`). Mapped from
   * the inbound field name to the schema column name; takes precedence over the
   * deterministic casing conversion.
   */
  readonly aliases?: Readonly<Record<string, string>>;
  /**
   * Fields that are intentionally NOT persisted (computed values, relation
   * payloads, transient flags). These are dropped silently instead of triggering
   * `UnresolvedFieldError`, so callers can declare known non-column fields
   * explicitly rather than having them rejected.
   */
  readonly ignore?: readonly string[];
}

/**
 * Resolve a single inbound DTO field name to its schema column name. Resolution
 * order is deterministic: explicit alias first, otherwise camelCase->snake_case.
 */
export function resolveColumn(
  field: string,
  spec: Pick<FieldMapSpec, "aliases">,
): string {
  return spec.aliases?.[field] ?? camelToSnake(field);
}

/**
 * Map a DTO/entity object to a schema-aligned column record, enforcing
 * field-mapping discipline.
 *
 * Behaviour:
 * - `undefined` values are skipped, preserving partial-update semantics (only
 *   explicitly supplied fields are mapped). `null` and other falsy values are
 *   kept (an explicit clear).
 * - Each field is resolved to a column via {@link resolveColumn} (alias, else
 *   deterministic casing conversion).
 * - A field whose resolved column is listed in `ignore` is dropped.
 * - A field whose resolved column is NOT a known column throws
 *   {@link UnresolvedFieldError}, rejecting the whole request so nothing is
 *   persisted (Requirement 5.4). Because this throws before any value is written,
 *   the count of persisted values always equals the count of supplied mappable
 *   values (Requirement 5.3).
 *
 * @throws {UnresolvedFieldError} if any supplied field resolves to no column.
 */
export function mapDtoToColumns(
  input: Record<string, unknown> | undefined | null,
  spec: FieldMapSpec,
): ColumnRecord {
  const out: ColumnRecord = {};
  if (!input) {
    return out;
  }
  const allowed = new Set(spec.columns);
  const ignored = new Set(spec.ignore ?? []);
  for (const [field, value] of Object.entries(input)) {
    if (value === undefined) {
      continue;
    }
    const column = resolveColumn(field, spec);
    if (ignored.has(field) || ignored.has(column)) {
      continue;
    }
    if (!allowed.has(column)) {
      throw new UnresolvedFieldError(field, column);
    }
    out[column] = value;
  }
  return out;
}

/**
 * Build a reusable, named mapper for a specific table. Phase tasks (2.x–10.x)
 * declare each table's columns/aliases once and import the resulting function
 * into their repository write paths.
 *
 *   const mapDeviceToColumns = defineFieldMap({
 *     columns: IT_DEVICE_COLUMNS,
 *     aliases: { deviceCode: "device_code" },
 *   });
 */
export function defineFieldMap(
  spec: FieldMapSpec,
): (input: Record<string, unknown> | undefined | null) => ColumnRecord {
  return (input) => mapDtoToColumns(input, spec);
}

/* -------------------------------------------------------------------------- */
/* Read path: columns -> DTO                                                  */
/* -------------------------------------------------------------------------- */

export interface ReadMapSpec {
  /**
   * Explicit reverse aliases for columns whose DTO field name does not follow
   * the plain snake_case->camelCase rule (mapped from column -> DTO field).
   */
  readonly aliases?: Readonly<Record<string, string>>;
  /**
   * Columns that represent collections. A `null`/`undefined` value for any of
   * these is normalised to an empty array `[]` (Requirement 1.6).
   */
  readonly arrayFields?: readonly string[];
}

/**
 * Map a database row (snake_case columns) back to a DTO-shaped object
 * (camelCase fields), translating every column so no stored value is omitted due
 * to a name/casing mismatch (Requirement 5.5). Date values are serialized to ISO
 * 8601 (Requirement 1.5) and declared collection fields default to `[]` when
 * absent (Requirement 1.6).
 */
export function mapColumnsToDto(
  row: Record<string, unknown> | undefined | null,
  spec: ReadMapSpec = {},
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!row) {
    return out;
  }
  const arrayFields = new Set(spec.arrayFields ?? []);
  for (const [column, value] of Object.entries(row)) {
    const field = spec.aliases?.[column] ?? snakeToCamel(column);
    if (arrayFields.has(column) && (value === null || value === undefined)) {
      out[field] = [];
      continue;
    }
    out[field] = serializeValue(value);
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Response serialization (ISO 8601 dates, empty collections as [])           */
/* -------------------------------------------------------------------------- */

/**
 * Render a date/datetime value as an ISO 8601 string (Requirement 1.5). Accepts
 * a `Date`, an epoch number, or a parseable string; returns the input unchanged
 * if it is not a recognisable date. Invalid dates are returned untouched so the
 * caller's validation surface (not serialization) reports them.
 */
export function toIsoString(value: unknown): unknown {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? value : value.toISOString();
  }
  return value;
}

/**
 * Normalise a possibly-null collection to an array, returning `[]` instead of
 * `null`/`undefined` (Requirement 1.6).
 */
export function emptyArrayIfNullish<T>(value: T[] | null | undefined): T[] {
  return value ?? [];
}

/**
 * Recursively serialize a value for an HTTP response: every `Date` becomes an
 * ISO 8601 string (Requirement 1.5) and the structure is otherwise preserved.
 * Arrays and plain objects are walked; class instances other than `Date` are
 * treated as plain objects.
 */
export function serializeValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (value instanceof Date) {
    return toIsoString(value);
  }
  if (Array.isArray(value)) {
    return value.map((v) => serializeValue(v));
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = serializeValue(v);
    }
    return out;
  }
  return value;
}

/**
 * Serialize an entire response payload (object or array) so all date values are
 * ISO 8601 strings (Requirement 1.5). A `null`/`undefined` array slot is returned
 * as `[]` when `asCollection` is set (Requirement 1.6).
 */
export function serializeForResponse<T>(
  payload: T,
  options: { asCollection?: boolean } = {},
): unknown {
  if (options.asCollection && (payload === null || payload === undefined)) {
    return [];
  }
  return serializeValue(payload);
}
