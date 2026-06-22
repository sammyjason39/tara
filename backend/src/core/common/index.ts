/**
 * Shared correctness primitives for the Core Departments Stabilization feature.
 *
 * These are introduced once and applied across all five phases (IT, Procurement,
 * Sales, Marketing, Payment).
 */
export {
  ColumnRecord,
  FieldMapSpec,
  ReadMapSpec,
  UnresolvedFieldError,
  camelToSnake,
  snakeToCamel,
  resolveColumn,
  mapDtoToColumns,
  defineFieldMap,
  mapColumnsToDto,
  toIsoString,
  emptyArrayIfNullish,
  serializeValue,
  serializeForResponse,
} from "./field-mapping";
