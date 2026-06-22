import { describe, it, expect, beforeEach } from 'vitest';
import { GlobalValidationPipe } from '../../../shared/pipes/global-validation.pipe';
import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { CreatePurchaseOrderDto } from './create-purchase-order.dto';

describe('CreatePurchaseOrderDto', () => {
  let pipe: GlobalValidationPipe;

  const createMetadata = (metatype: any): ArgumentMetadata => ({
    type: 'body',
    metatype,
    data: '',
  });

  beforeEach(() => {
    pipe = new GlobalValidationPipe();
  });

  it('should pass with valid purchase order data', async () => {
    const value = {
      vendorId: 'vendor-1',
      lineItems: [
        { itemId: 'item-1', quantity: 10, unitPrice: 25.50 },
      ],
    };
    const result = await pipe.transform(value, createMetadata(CreatePurchaseOrderDto));
    expect(result).toBeInstanceOf(CreatePurchaseOrderDto);
    expect(result.vendorId).toBe('vendor-1');
    expect(result.lineItems).toHaveLength(1);
  });

  it('should pass with multiple line items', async () => {
    const value = {
      vendorId: 'vendor-2',
      lineItems: [
        { itemId: 'item-1', quantity: 5, unitPrice: 10 },
        { itemId: 'item-2', quantity: 3, unitPrice: 50 },
        { itemId: 'item-3', quantity: 1, unitPrice: 200 },
      ],
    };
    const result = await pipe.transform(value, createMetadata(CreatePurchaseOrderDto));
    expect(result.lineItems).toHaveLength(3);
  });

  it('should reject missing vendorId', async () => {
    const value = {
      lineItems: [{ itemId: 'item-1', quantity: 1, unitPrice: 10 }],
    };
    try {
      await pipe.transform(value, createMetadata(CreatePurchaseOrderDto));
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as any;
      const fields = response.errors.map((e: any) => e.field);
      expect(fields).toContain('vendorId');
    }
  });

  it('should reject empty lineItems array', async () => {
    const value = { vendorId: 'vendor-1', lineItems: [] };
    try {
      await pipe.transform(value, createMetadata(CreatePurchaseOrderDto));
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
      vendorId: 'vendor-1',
      lineItems: [{ itemId: 'item-1', quantity: 0, unitPrice: 10 }],
    };
    try {
      await pipe.transform(value, createMetadata(CreatePurchaseOrderDto));
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

  it('should reject line item with unitPrice 0', async () => {
    const value = {
      vendorId: 'vendor-1',
      lineItems: [{ itemId: 'item-1', quantity: 5, unitPrice: 0 }],
    };
    try {
      await pipe.transform(value, createMetadata(CreatePurchaseOrderDto));
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

  it('should reject line item with negative quantity', async () => {
    const value = {
      vendorId: 'vendor-1',
      lineItems: [{ itemId: 'item-1', quantity: -3, unitPrice: 10 }],
    };
    try {
      await pipe.transform(value, createMetadata(CreatePurchaseOrderDto));
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

  it('should return structured error format', async () => {
    const value = { vendorId: '', lineItems: [] };
    try {
      await pipe.transform(value, createMetadata(CreatePurchaseOrderDto));
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as any;
      expect(response.message).toBe('Validation failed');
      expect(response.errors).toBeInstanceOf(Array);
      for (const err of response.errors) {
        expect(err).toHaveProperty('field');
        expect(err).toHaveProperty('message');
      }
    }
  });
});
