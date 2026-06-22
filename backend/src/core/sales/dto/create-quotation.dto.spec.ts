import { describe, it, expect, beforeEach } from 'vitest';
import { GlobalValidationPipe } from '../../../shared/pipes/global-validation.pipe';
import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { CreateQuotationDto } from './create-quotation.dto';

describe('CreateQuotationDto', () => {
  let pipe: GlobalValidationPipe;

  const createMetadata = (metatype: any): ArgumentMetadata => ({
    type: 'body',
    metatype,
    data: '',
  });

  beforeEach(() => {
    pipe = new GlobalValidationPipe();
  });

  it('should pass with valid quotation data', async () => {
    const value = {
      lineItems: [
        { itemId: 'item-1', quantity: 5, unitPrice: 100 },
      ],
    };
    const result = await pipe.transform(value, createMetadata(CreateQuotationDto));
    expect(result).toBeInstanceOf(CreateQuotationDto);
    expect(result.lineItems).toHaveLength(1);
  });

  it('should pass with discount fields', async () => {
    const value = {
      lineItems: [
        { itemId: 'item-1', quantity: 2, unitPrice: 50, discountType: 'percentage', discountValue: 10 },
        { itemId: 'item-2', quantity: 1, unitPrice: 200, discountType: 'fixed', discountValue: 20 },
      ],
    };
    const result = await pipe.transform(value, createMetadata(CreateQuotationDto));
    expect(result.lineItems).toHaveLength(2);
  });

  it('should reject empty lineItems array', async () => {
    const value = { lineItems: [] };
    try {
      await pipe.transform(value, createMetadata(CreateQuotationDto));
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as any;
      const fields = response.errors.map((e: any) => e.field);
      expect(fields).toContain('lineItems');
    }
  });

  it('should reject line item with quantity 0', async () => {
    const value = {
      lineItems: [{ itemId: 'item-1', quantity: 0, unitPrice: 100 }],
    };
    try {
      await pipe.transform(value, createMetadata(CreateQuotationDto));
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as any;
      const hasQuantityError = response.errors.some(
        (e: any) => e.field.includes('quantity'),
      );
      expect(hasQuantityError).toBe(true);
    }
  });

  it('should reject line item with negative unitPrice', async () => {
    const value = {
      lineItems: [{ itemId: 'item-1', quantity: 1, unitPrice: -10 }],
    };
    try {
      await pipe.transform(value, createMetadata(CreateQuotationDto));
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as any;
      const hasUnitPriceError = response.errors.some(
        (e: any) => e.field.includes('unitPrice'),
      );
      expect(hasUnitPriceError).toBe(true);
    }
  });

  it('should reject negative discountValue', async () => {
    const value = {
      lineItems: [{ itemId: 'item-1', quantity: 1, unitPrice: 100, discountType: 'percentage', discountValue: -5 }],
    };
    try {
      await pipe.transform(value, createMetadata(CreateQuotationDto));
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as any;
      const hasDiscountError = response.errors.some(
        (e: any) => e.field.includes('discountValue'),
      );
      expect(hasDiscountError).toBe(true);
    }
  });

  it('should return structured error format', async () => {
    const value = { lineItems: [] };
    try {
      await pipe.transform(value, createMetadata(CreateQuotationDto));
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as any;
      expect(response.message).toBe('Validation failed');
      expect(response.errors).toBeInstanceOf(Array);
      expect(response.errors.length).toBeGreaterThan(0);
    }
  });
});
