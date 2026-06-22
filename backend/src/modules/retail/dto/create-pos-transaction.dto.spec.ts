import { describe, it, expect, beforeEach } from 'vitest';
import { GlobalValidationPipe } from '../../../shared/pipes/global-validation.pipe';
import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { CreatePosTransactionDto } from './create-pos-transaction.dto';

describe('CreatePosTransactionDto', () => {
  let pipe: GlobalValidationPipe;

  const createMetadata = (metatype: any): ArgumentMetadata => ({
    type: 'body',
    metatype,
    data: '',
  });

  beforeEach(() => {
    pipe = new GlobalValidationPipe();
  });

  it('should pass with valid POS transaction data', async () => {
    const value = {
      lineItems: [
        { itemId: 'item-1', quantity: 2 },
      ],
      paymentMethod: 'cash',
    };
    const result = await pipe.transform(value, createMetadata(CreatePosTransactionDto));
    expect(result).toBeInstanceOf(CreatePosTransactionDto);
    expect(result.lineItems).toHaveLength(1);
    expect(result.paymentMethod).toBe('cash');
  });

  it('should pass with electronic payment and discount', async () => {
    const value = {
      lineItems: [
        { itemId: 'item-1', quantity: 1, discountType: 'percentage', discountValue: 10 },
        { itemId: 'item-2', quantity: 3, sku: 'SKU-002' },
      ],
      paymentMethod: 'electronic',
    };
    const result = await pipe.transform(value, createMetadata(CreatePosTransactionDto));
    expect(result.lineItems).toHaveLength(2);
  });

  it('should reject empty lineItems array', async () => {
    const value = { lineItems: [], paymentMethod: 'cash' };
    try {
      await pipe.transform(value, createMetadata(CreatePosTransactionDto));
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as any;
      const fields = response.errors.map((e: any) => e.field);
      expect(fields).toContain('lineItems');
    }
  });

  it('should reject quantity of 0', async () => {
    const value = {
      lineItems: [{ itemId: 'item-1', quantity: 0 }],
      paymentMethod: 'cash',
    };
    try {
      await pipe.transform(value, createMetadata(CreatePosTransactionDto));
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

  it('should reject quantity exceeding 9999', async () => {
    const value = {
      lineItems: [{ itemId: 'item-1', quantity: 10000 }],
      paymentMethod: 'cash',
    };
    try {
      await pipe.transform(value, createMetadata(CreatePosTransactionDto));
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

  it('should reject invalid payment method', async () => {
    const value = {
      lineItems: [{ itemId: 'item-1', quantity: 1 }],
      paymentMethod: 'crypto',
    };
    try {
      await pipe.transform(value, createMetadata(CreatePosTransactionDto));
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as any;
      const fields = response.errors.map((e: any) => e.field);
      expect(fields).toContain('paymentMethod');
    }
  });

  it('should accept quantity at boundary 9999', async () => {
    const value = {
      lineItems: [{ itemId: 'item-1', quantity: 9999 }],
      paymentMethod: 'cash',
    };
    const result = await pipe.transform(value, createMetadata(CreatePosTransactionDto));
    expect(result.lineItems[0].quantity).toBe(9999);
  });

  it('should return structured error format', async () => {
    const value = { lineItems: [], paymentMethod: 'invalid' };
    try {
      await pipe.transform(value, createMetadata(CreatePosTransactionDto));
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
