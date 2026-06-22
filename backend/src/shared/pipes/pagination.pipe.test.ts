import { describe, it, expect } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { PaginationPipe, PaginationParams } from "./pagination.pipe";

describe("PaginationPipe", () => {
  const pipe = new PaginationPipe();

  describe("defaults", () => {
    it("should return page=1, pageSize=50 when no params provided", () => {
      const result = pipe.transform({});
      expect(result).toEqual({ page: 1, pageSize: 50 });
    });

    it("should return defaults for undefined values", () => {
      const result = pipe.transform({ page: undefined, pageSize: undefined });
      expect(result).toEqual({ page: 1, pageSize: 50 });
    });

    it("should return defaults for null values", () => {
      const result = pipe.transform({ page: null, pageSize: null });
      expect(result).toEqual({ page: 1, pageSize: 50 });
    });

    it("should return defaults for empty string values", () => {
      const result = pipe.transform({ page: "", pageSize: "" });
      expect(result).toEqual({ page: 1, pageSize: 50 });
    });
  });

  describe("valid parameters", () => {
    it("should parse valid numeric strings", () => {
      const result = pipe.transform({ page: "3", pageSize: "25" });
      expect(result).toEqual({ page: 3, pageSize: 25 });
    });

    it("should accept page=1 (minimum)", () => {
      const result = pipe.transform({ page: "1", pageSize: "50" });
      expect(result).toEqual({ page: 1, pageSize: 50 });
    });

    it("should accept pageSize=1 (minimum)", () => {
      const result = pipe.transform({ page: "1", pageSize: "1" });
      expect(result).toEqual({ page: 1, pageSize: 1 });
    });

    it("should accept pageSize=200 (maximum)", () => {
      const result = pipe.transform({ page: "1", pageSize: "200" });
      expect(result).toEqual({ page: 1, pageSize: 200 });
    });

    it("should accept numeric values (not just strings)", () => {
      const result = pipe.transform({ page: 5, pageSize: 100 });
      expect(result).toEqual({ page: 5, pageSize: 100 });
    });

    it("should floor decimal values", () => {
      const result = pipe.transform({ page: "2.9", pageSize: "10.7" });
      expect(result).toEqual({ page: 2, pageSize: 10 });
    });
  });

  describe("invalid parameters — page", () => {
    it("should throw BadRequestException when page < 1", () => {
      expect(() => pipe.transform({ page: "0", pageSize: "50" })).toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when page is negative", () => {
      expect(() => pipe.transform({ page: "-1", pageSize: "50" })).toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when page is non-numeric", () => {
      expect(() => pipe.transform({ page: "abc", pageSize: "50" })).toThrow(
        BadRequestException,
      );
    });

    it("should throw with descriptive message for non-numeric page", () => {
      expect(() => pipe.transform({ page: "abc" })).toThrow(
        /page must be a valid number/,
      );
    });
  });

  describe("invalid parameters — pageSize", () => {
    it("should throw BadRequestException when pageSize < 1", () => {
      expect(() => pipe.transform({ page: "1", pageSize: "0" })).toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when pageSize is negative", () => {
      expect(() => pipe.transform({ page: "1", pageSize: "-5" })).toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when pageSize > 200", () => {
      expect(() => pipe.transform({ page: "1", pageSize: "201" })).toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when pageSize is non-numeric", () => {
      expect(() => pipe.transform({ page: "1", pageSize: "xyz" })).toThrow(
        BadRequestException,
      );
    });

    it("should throw with descriptive message for non-numeric pageSize", () => {
      expect(() => pipe.transform({ pageSize: "xyz" })).toThrow(
        /pageSize must be a valid number/,
      );
    });

    it("should throw with descriptive message for pageSize > 200", () => {
      expect(() => pipe.transform({ pageSize: "201" })).toThrow(
        /pageSize must be <= 200/,
      );
    });
  });

  describe("edge cases", () => {
    it("should handle large valid page numbers", () => {
      const result = pipe.transform({ page: "99999", pageSize: "50" });
      expect(result).toEqual({ page: 99999, pageSize: 50 });
    });

    it("should throw for Infinity", () => {
      expect(() => pipe.transform({ page: "Infinity" })).toThrow(
        BadRequestException,
      );
    });

    it("should throw for NaN string", () => {
      expect(() => pipe.transform({ page: "NaN" })).toThrow(
        BadRequestException,
      );
    });
  });
});
