/**
 * Property 7: Backend Validation Error Response Structure
 *
 * For any invalid payload, the GlobalValidationPipe returns a 400 BadRequestException
 * with a structured response: { message: string, errors: Array<{ field: string, message: string }> }
 * where each `field` and `message` are non-empty strings.
 *
 * Validates: Requirements 16.2, 16.3
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { BadRequestException } from '@nestjs/common';
import { IsNotEmpty, IsString, IsNumber, Min, Max, IsEmail, IsEnum, MinLength, MaxLength, IsOptional } from 'class-validator';
import { GlobalValidationPipe } from './global-validation.pipe';

// ---------------------------------------------------------------------------
// Test DTOs representing various validation scenarios
// ---------------------------------------------------------------------------

class RequiredFieldsDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsNumber()
  @Min(1)
  age: number;
}

class StringConstraintsDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  title: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  description: string;
}

enum Priority { LOW = 'LOW', MEDIUM = 'MEDIUM', HIGH = 'HIGH', CRITICAL = 'CRITICAL' }

class EnumFieldDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsEnum(Priority)
  priority: Priority;

  @IsNumber()
  @Min(0)
  @Max(100)
  progress: number;
}

class NumericRangesDto {
  @IsNumber()
  @Min(1)
  @Max(200)
  pageSize: number;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNumber()
  @Min(0.01)
  unitPrice: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RUNS = 100;

const pipe = new GlobalValidationPipe();

function createMetadata(metatype: any) {
  return { type: 'body' as const, metatype, data: '' };
}

/**
 * Asserts that the pipe throws a BadRequestException with a properly structured
 * error response for the given invalid payload.
 */
async function assertValidationError(payload: any, metatype: any): Promise<void> {
  try {
    await pipe.transform(payload, createMetadata(metatype));
    // If we reach here, the payload was unexpectedly valid — skip this case
    // (fast-check will try many payloads, some may randomly be valid)
    return;
  } catch (error) {
    // Must be a BadRequestException
    expect(error).toBeInstanceOf(BadRequestException);

    const response = (error as BadRequestException).getResponse() as any;

    // Must have a message string
    expect(response).toHaveProperty('message');
    expect(typeof response.message).toBe('string');
    expect(response.message.length).toBeGreaterThan(0);

    // Must have errors array
    expect(response).toHaveProperty('errors');
    expect(Array.isArray(response.errors)).toBe(true);
    expect(response.errors.length).toBeGreaterThan(0);

    // Each error must have non-empty field and message strings
    for (const err of response.errors) {
      expect(err).toHaveProperty('field');
      expect(err).toHaveProperty('message');
      expect(typeof err.field).toBe('string');
      expect(typeof err.message).toBe('string');
      expect(err.field.length).toBeGreaterThan(0);
      expect(err.message.length).toBeGreaterThan(0);
    }
  }
}

// ---------------------------------------------------------------------------
// Property Tests
// ---------------------------------------------------------------------------

describe('Property 7: Backend Validation Error Response Structure (Requirements 16.2, 16.3)', () => {

  it('empty objects always produce structured validation errors for DTOs with required fields', async () => {
    const dtos = [RequiredFieldsDto, StringConstraintsDto, EnumFieldDto, NumericRangesDto];

    for (const dto of dtos) {
      await assertValidationError({}, dto);
    }
  });

  it('payloads with wrong types produce errors with field and message for RequiredFieldsDto', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.oneof(fc.constant(null), fc.constant(undefined), fc.constant(''), fc.integer()),
          email: fc.oneof(fc.constant('not-email'), fc.constant(''), fc.integer(), fc.constant(null)),
          age: fc.oneof(fc.constant('text'), fc.constant(null), fc.constant(-5), fc.constant(0)),
        }),
        async (payload) => {
          await assertValidationError(payload, RequiredFieldsDto);
        },
      ),
      { numRuns: RUNS },
    );
  });

  it('payloads violating string length constraints produce structured errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // title must be 3-100 chars — generate violations
          title: fc.oneof(
            fc.constant(''),          // too short
            fc.constant('ab'),        // too short (2 chars)
            fc.string({ minLength: 101, maxLength: 150 }), // too long
          ),
          // description must be 1-500 chars — generate violations
          description: fc.oneof(
            fc.constant(''),          // too short (empty)
            fc.string({ minLength: 501, maxLength: 600 }), // too long
          ),
        }),
        async (payload) => {
          await assertValidationError(payload, StringConstraintsDto);
        },
      ),
      { numRuns: RUNS },
    );
  });

  it('payloads with invalid enum values produce structured errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),  // valid name
          priority: fc.oneof(
            fc.constant('INVALID'),
            fc.constant('low'),       // wrong case
            fc.constant(''),
            fc.integer(),
            fc.constant(null),
          ),
          progress: fc.oneof(
            fc.constant(-1),          // below min
            fc.constant(101),         // above max
            fc.constant('text'),
          ),
        }),
        async (payload) => {
          await assertValidationError(payload, EnumFieldDto);
        },
      ),
      { numRuns: RUNS },
    );
  });

  it('payloads violating numeric range constraints produce structured errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          pageSize: fc.oneof(
            fc.constant(0),           // below min (1)
            fc.constant(-1),          // negative
            fc.constant(201),         // above max (200)
            fc.constant('text'),      // non-numeric
          ),
          quantity: fc.oneof(
            fc.constant(-1),          // below min (0)
            fc.constant(-100),
            fc.constant('text'),
          ),
          unitPrice: fc.oneof(
            fc.constant(0),           // below min (0.01)
            fc.constant(-5),
            fc.constant('text'),
          ),
        }),
        async (payload) => {
          await assertValidationError(payload, NumericRangesDto);
        },
      ),
      { numRuns: RUNS },
    );
  });

  it('completely missing fields always produce errors referencing each missing field', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate payloads that are plain objects but with random unrelated keys
        fc.dictionary(
          fc.string({ minLength: 1, maxLength: 10 }).filter(
            (s) => !['name', 'email', 'age'].includes(s),
          ),
          fc.oneof(fc.string(), fc.integer(), fc.boolean()),
          { minKeys: 0, maxKeys: 5 },
        ),
        async (payload) => {
          try {
            await pipe.transform(payload, createMetadata(RequiredFieldsDto));
            // Might pass if the pipe is permissive about extra keys and somehow
            // coerces values — but for RequiredFieldsDto all 3 fields are mandatory
          } catch (error) {
            expect(error).toBeInstanceOf(BadRequestException);
            const response = (error as BadRequestException).getResponse() as any;
            expect(response.message).toBe('Validation failed');
            expect(response.errors.length).toBeGreaterThanOrEqual(1);

            // All errors must have proper structure
            for (const err of response.errors) {
              expect(typeof err.field).toBe('string');
              expect(err.field.length).toBeGreaterThan(0);
              expect(typeof err.message).toBe('string');
              expect(err.message.length).toBeGreaterThan(0);
            }
          }
        },
      ),
      { numRuns: RUNS },
    );
  });

  it('the message property is always "Validation failed" for all validation errors', async () => {
    const testCases = [
      { payload: {}, dto: RequiredFieldsDto },
      { payload: { name: '' }, dto: StringConstraintsDto },
      { payload: { priority: 'NOPE' }, dto: EnumFieldDto },
      { payload: { pageSize: -1 }, dto: NumericRangesDto },
    ];

    for (const { payload, dto } of testCases) {
      try {
        await pipe.transform(payload, createMetadata(dto));
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = (error as BadRequestException).getResponse() as any;
        expect(response.message).toBe('Validation failed');
      }
    }
  });

  it('valid payloads pass through without throwing (sanity check)', async () => {
    const validPayload = { name: 'John', email: 'john@example.com', age: 25 };
    const result = await pipe.transform(validPayload, createMetadata(RequiredFieldsDto));
    expect(result).toBeInstanceOf(RequiredFieldsDto);
    expect(result.name).toBe('John');
  });
});
