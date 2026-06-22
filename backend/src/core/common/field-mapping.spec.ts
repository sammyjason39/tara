import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
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
  UnresolvedFieldError,
} from "./field-mapping";

/* -------------------------------------------------------------------------- */
/* Casing conversions                                                         */
/* -------------------------------------------------------------------------- */

describe("camelToSnake", () => {
  it("converts camelCase to snake_case", () => {
    expect(camelToSnake("deviceId")).toBe("device_id");
    expect(camelToSnake("createdAt")).toBe("created_at");
    expect(camelToSnake("totalGrossPay")).toBe("total_gross_pay");
  });

  it("leaves already-snake_case input unchanged", () => {
    expect(camelToSnake("tenant_id")).toBe("tenant_id");
    expect(camelToSnake("name")).toBe("name");
  });

  it("handles runs of capitals (acronyms)", () => {
    expect(camelToSnake("ISODate")).toBe("iso_date");
    expect(camelToSnake("posDeviceURL")).toBe("pos_device_url");
  });
});

describe("snakeToCamel", () => {
  it("converts snake_case to camelCase", () => {
    expect(snakeToCamel("device_id")).toBe("deviceId");
    expect(snakeToCamel("created_at")).toBe("createdAt");
  });

  it("leaves single-word input unchanged", () => {
    expect(snakeToCamel("name")).toBe("name");
  });
});

/* -------------------------------------------------------------------------- */
/* resolveColumn                                                              */
/* -------------------------------------------------------------------------- */

describe("resolveColumn", () => {
  it("prefers an explicit alias over the casing conversion", () => {
    expect(resolveColumn("positionId", { aliases: { positionId: "job_role_id" } })).toBe(
      "job_role_id",
    );
  });

  it("falls back to deterministic camel->snake when no alias", () => {
    expect(resolveColumn("deviceId", {})).toBe("device_id");
  });
});

/* -------------------------------------------------------------------------- */
/* mapDtoToColumns (write discipline)                                          */
/* -------------------------------------------------------------------------- */

describe("mapDtoToColumns", () => {
  const spec = {
    columns: ["device_id", "name", "status", "tenant_id"],
    aliases: { code: "device_id" },
  };

  it("translates camelCase fields to snake_case columns (5.2)", () => {
    expect(mapDtoToColumns({ deviceId: "d1", name: "Printer" }, spec)).toEqual({
      device_id: "d1",
      name: "Printer",
    });
  });

  it("applies explicit aliases (5.1)", () => {
    expect(mapDtoToColumns({ code: "d1" }, spec)).toEqual({ device_id: "d1" });
  });

  it("passes through correctly named columns unchanged", () => {
    expect(mapDtoToColumns({ tenant_id: "t1", status: "active" }, spec)).toEqual({
      tenant_id: "t1",
      status: "active",
    });
  });

  it("skips undefined values but keeps explicit null/falsy (partial update)", () => {
    expect(
      mapDtoToColumns({ name: undefined, status: null, deviceId: "" }, spec),
    ).toEqual({ status: null, device_id: "" });
  });

  it("drops fields explicitly declared in the ignore list", () => {
    expect(
      mapDtoToColumns(
        { name: "x", fullName: "computed" },
        { ...spec, ignore: ["full_name"] },
      ),
    ).toEqual({ name: "x" });
  });

  it("rejects an unresolved field naming it, persisting nothing (5.4)", () => {
    expect(() => mapDtoToColumns({ name: "x", bogusField: 1 }, spec)).toThrow(
      UnresolvedFieldError,
    );
    try {
      mapDtoToColumns({ bogusField: 1 }, spec);
    } catch (e) {
      expect(e).toBeInstanceOf(UnresolvedFieldError);
      expect((e as UnresolvedFieldError).field).toBe("bogusField");
      expect((e as UnresolvedFieldError).getStatus()).toBe(400);
      expect((e as UnresolvedFieldError).message).toContain("bogusField");
    }
  });

  it("returns empty object for nullish input", () => {
    expect(mapDtoToColumns(undefined, spec)).toEqual({});
    expect(mapDtoToColumns(null, spec)).toEqual({});
  });
});

describe("defineFieldMap", () => {
  it("builds a reusable named mapper", () => {
    const map = defineFieldMap({ columns: ["device_id"], aliases: { code: "device_id" } });
    expect(map({ code: "d1" })).toEqual({ device_id: "d1" });
    expect(() => map({ nope: 1 })).toThrow(UnresolvedFieldError);
  });
});

/* -------------------------------------------------------------------------- */
/* mapColumnsToDto (read discipline)                                           */
/* -------------------------------------------------------------------------- */

describe("mapColumnsToDto", () => {
  it("translates every column back to its camelCase DTO field (5.5)", () => {
    expect(mapColumnsToDto({ device_id: "d1", status: "active" })).toEqual({
      deviceId: "d1",
      status: "active",
    });
  });

  it("serializes Date columns as ISO 8601 strings (1.5)", () => {
    const d = new Date("2024-01-02T03:04:05.000Z");
    expect(mapColumnsToDto({ created_at: d })).toEqual({
      createdAt: "2024-01-02T03:04:05.000Z",
    });
  });

  it("returns [] for a null declared collection column (1.6)", () => {
    expect(
      mapColumnsToDto({ tags: null }, { arrayFields: ["tags"] }),
    ).toEqual({ tags: [] });
  });

  it("honours reverse aliases", () => {
    expect(
      mapColumnsToDto({ job_role_id: "r1" }, { aliases: { job_role_id: "positionId" } }),
    ).toEqual({ positionId: "r1" });
  });
});

/* -------------------------------------------------------------------------- */
/* Serialization helpers                                                       */
/* -------------------------------------------------------------------------- */

describe("toIsoString", () => {
  it("renders a Date as ISO 8601", () => {
    expect(toIsoString(new Date("2024-06-01T00:00:00.000Z"))).toBe(
      "2024-06-01T00:00:00.000Z",
    );
  });
  it("passes through non-dates", () => {
    expect(toIsoString("hi")).toBe("hi");
    expect(toIsoString(42)).toBe(42);
  });
});

describe("emptyArrayIfNullish", () => {
  it("returns [] for null/undefined", () => {
    expect(emptyArrayIfNullish(null)).toEqual([]);
    expect(emptyArrayIfNullish(undefined)).toEqual([]);
  });
  it("returns the array when present (including empty)", () => {
    expect(emptyArrayIfNullish([1, 2])).toEqual([1, 2]);
    expect(emptyArrayIfNullish([])).toEqual([]);
  });
});

describe("serializeValue / serializeForResponse", () => {
  it("recursively converts nested Date values to ISO 8601", () => {
    const input = {
      id: "1",
      created_at: new Date("2024-01-01T00:00:00.000Z"),
      nested: { updated_at: new Date("2024-02-01T00:00:00.000Z") },
      events: [{ at: new Date("2024-03-01T00:00:00.000Z") }],
    };
    expect(serializeValue(input)).toEqual({
      id: "1",
      created_at: "2024-01-01T00:00:00.000Z",
      nested: { updated_at: "2024-02-01T00:00:00.000Z" },
      events: [{ at: "2024-03-01T00:00:00.000Z" }],
    });
  });

  it("returns [] for a nullish payload when asCollection is set (1.6)", () => {
    expect(serializeForResponse(null, { asCollection: true })).toEqual([]);
    expect(serializeForResponse(undefined, { asCollection: true })).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */
/* Property-based tests                                                        */
/* -------------------------------------------------------------------------- */

// Feature: core-departments-stabilization, Property 4: Round-trip persistence of
// created and updated records (correct DTO-to-column mapping with no name/casing
// drops, dates serialized ISO 8601, unresolved fields rejected).
// Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 1.5, 1.6

// Words of >=2 lowercase letters. Single-letter sub-words are excluded because
// they produce consecutive capitals (e.g. "aAA") for which camelCase<->snake_case
// is genuinely not bijective; real DTO field names do not contain them.
const lowerWord = fc.stringMatching(/^[a-z]{2,8}$/);

// A camelCase field name built from 1..4 lowercase words.
const camelField = fc
  .array(lowerWord, { minLength: 1, maxLength: 4 })
  .map(([head, ...rest]) =>
    [head, ...rest.map((w) => w[0].toUpperCase() + w.slice(1))].join(""),
  );

const jsonValue = fc.oneof(
  fc.string(),
  fc.integer(),
  fc.boolean(),
  fc.constant(null),
);

describe("field-mapping properties", () => {
  it("camel->snake->camel round-trips for camelCase identifiers (5.2/5.5)", () => {
    fc.assert(
      fc.property(camelField, (field) => {
        const column = camelToSnake(field);
        // snake column is all-lowercase with underscores
        expect(column).toMatch(/^[a-z][a-z0-9_]*$/);
        // and converting back yields the original camelCase field
        expect(snakeToCamel(column)).toBe(field);
      }),
      { numRuns: 200 },
    );
  });

  it("resolution is deterministic: same field always resolves to same column (5.2)", () => {
    fc.assert(
      fc.property(camelField, (field) => {
        expect(resolveColumn(field, {})).toBe(resolveColumn(field, {}));
        expect(camelToSnake(field)).toBe(camelToSnake(field));
      }),
      { numRuns: 200 },
    );
  });

  it("every supplied mappable value is persisted to its column with no drops (5.1/5.3)", () => {
    fc.assert(
      fc.property(
        fc.dictionary(camelField, jsonValue, { minKeys: 1, maxKeys: 8 }),
        (dto) => {
          // Build a spec whose columns exactly cover the dto's resolved columns.
          const fields = Object.keys(dto);
          const columns = fields.map((f) => camelToSnake(f));
          const out = mapDtoToColumns(dto, { columns });

          // No value with a real column is dropped: count of persisted values
          // equals count of supplied mappable values (5.3).
          const supplied = fields.filter((f) => dto[f] !== undefined);
          expect(Object.keys(out).length).toBe(
            new Set(supplied.map((f) => camelToSnake(f))).size,
          );

          // Each persisted value sits under its corresponding column (5.1).
          for (const f of supplied) {
            expect(out[camelToSnake(f)]).toEqual(dto[f]);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it("round-trips a created record back to the DTO with equal field values (Property 4)", () => {
    fc.assert(
      fc.property(
        fc.dictionary(camelField, jsonValue, { minKeys: 1, maxKeys: 8 }),
        (dto) => {
          const defined = Object.fromEntries(
            Object.entries(dto).filter(([, v]) => v !== undefined),
          );
          const columns = Object.keys(defined).map((f) => camelToSnake(f));
          const persisted = mapDtoToColumns(defined, { columns });
          const readBack = mapColumnsToDto(persisted);
          // Reading back within the same mapping yields the supplied values
          // under their original camelCase field names (no name/casing drops).
          for (const f of Object.keys(defined)) {
            expect(readBack[f]).toEqual(defined[f]);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it("rejects any field that resolves to no schema column, persisting nothing (5.4)", () => {
    fc.assert(
      fc.property(
        fc.dictionary(camelField, jsonValue, { minKeys: 1, maxKeys: 6 }),
        camelField,
        (dto, extra) => {
          const fields = Object.keys(dto);
          // Columns cover the dto fields but NOT the extra field.
          const columns = fields
            .map((f) => camelToSnake(f))
            .filter((c) => c !== camelToSnake(extra));
          fc.pre(!columns.includes(camelToSnake(extra)));
          const bad = { ...dto, [extra]: "x" };
          // The presence of an unresolved field rejects the whole request.
          expect(() => mapDtoToColumns(bad, { columns })).toThrow(
            UnresolvedFieldError,
          );
        },
      ),
      { numRuns: 200 },
    );
  });

  it("serializes every Date value as an ISO 8601 string (1.5)", () => {
    fc.assert(
      fc.property(fc.date({ noInvalidDate: true }), (d) => {
        const out = serializeValue({ created_at: d }) as Record<string, unknown>;
        expect(out.created_at).toBe(d.toISOString());
        expect(typeof out.created_at).toBe("string");
      }),
      { numRuns: 200 },
    );
  });
});
