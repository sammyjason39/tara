import { describe, it, expect, beforeEach } from 'vitest';
import { GlobalValidationPipe } from '../../../shared/pipes/global-validation.pipe';
import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { CreatePaymentDto, PaymentMethod } from './create-payment.dto';

describe('CreatePaymentDto', () => {
  let pipe: GlobalValidationPipe;

  const createMetadata = (metatype: any): ArgumentMetadata => ({
    type: 'body',
    metatype,
    data: '',
  });

  beforeEach(() => {
    pipe = new GlobalValidationPipe();
  });

  it('should pass with valid payment data', async () => {
    const value = {
      recipient: 'Vendor A',
      amount: 1000,
      paymentMethod: 'bank_transfer',
    };
    const result = await pipe.transform(value, createMetadata(CreatePaymentDto));
    expect(result).toBeInstanceOf(CreatePaymentDto);
    expect(result.recipient).toBe('Vendor A');
    expect(result.amount).toBe(1000);
  });

  it('should pass with all optional fields', async () => {
    const value = {
      recipient: 'Vendor B',
      amount: 500.50,
      paymentMethod: 'cash',
      purpose: 'Office supplies',
      scheduledDate: '2025-01-15',
    };
    const result = await pipe.transform(value, createMetadata(CreatePaymentDto));
    expect(result.purpose).toBe('Office supplies');
    expect(result.scheduledDate).toBe('2025-01-15');
  });

  it('should reject empty recipient', async () => {
    const value = { recipient: '', amount: 100, paymentMethod: 'cash' };
    try {
      await pipe.transform(value, createMetadata(CreatePaymentDto));
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as any;
      const fields = response.errors.map((e: any) => e.field);
      expect(fields).toContain('recipient');
    }
  });

  it('should reject amount of 0', async () => {
    const value = { recipient: 'Test', amount: 0, paymentMethod: 'cash' };
    try {
      await pipe.transform(value, createMetadata(CreatePaymentDto));
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as any;
      const fields = response.errors.map((e: any) => e.field);
      expect(fields).toContain('amount');
    }
  });

  it('should reject negative amount', async () => {
    const value = { recipient: 'Test', amount: -50, paymentMethod: 'cash' };
    try {
      await pipe.transform(value, createMetadata(CreatePaymentDto));
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as any;
      const fields = response.errors.map((e: any) => e.field);
      expect(fields).toContain('amount');
    }
  });

  it('should reject invalid payment method', async () => {
    const value = { recipient: 'Test', amount: 100, paymentMethod: 'bitcoin' };
    try {
      await pipe.transform(value, createMetadata(CreatePaymentDto));
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as any;
      const fields = response.errors.map((e: any) => e.field);
      expect(fields).toContain('paymentMethod');
    }
  });

  it('should return structured error format', async () => {
    const value = { recipient: '', amount: -1, paymentMethod: 'invalid' };
    try {
      await pipe.transform(value, createMetadata(CreatePaymentDto));
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as any;
      expect(response.message).toBe('Validation failed');
      expect(response.errors).toBeInstanceOf(Array);
      for (const err of response.errors) {
        expect(err).toHaveProperty('field');
        expect(err).toHaveProperty('message');
        expect(typeof err.field).toBe('string');
        expect(typeof err.message).toBe('string');
      }
    }
  });
});
