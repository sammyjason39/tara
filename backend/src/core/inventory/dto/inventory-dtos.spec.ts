import { describe, it, expect, beforeEach } from 'vitest';
import { GlobalValidationPipe } from '../../../shared/pipes/global-validation.pipe';
import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { UpdateItemDto } from './update-item.dto';
import { CreateMovementDto, MovementType } from './create-movement.dto';
import { StockAdjustmentDto } from './stock-adjustment.dto';

describe('Inventory Validation DTOs', () => {
  let pipe: GlobalValidationPipe;

  const createMetadata = (metatype: any): ArgumentMetadata => ({
    type: 'body',
    metatype,
    data: '',
  });

  beforeEach(() => {
    pipe = new GlobalValidationPipe();
  });

  describe('UpdateItemDto', () => {
    it('should pass with valid partial update (name only)', async () => {
      const value = { name: 'Widget' };
      const result = await pipe.transform(value, createMetadata(UpdateItemDto));
      expect(result).toBeInstanceOf(UpdateItemDto);
      expect(result.name).toBe('Widget');
    });

    it('should pass with all optional fields provided', async () => {
      const value = { name: 'Item', sku: 'SKU-001', unitOfMeasure: 'pcs', category: 'ITEM' };
      const result = await pipe.transform(value, createMetadata(UpdateItemDto));
      expect(result).toBeInstanceOf(UpdateItemDto);
      expect(result.sku).toBe('SKU-001');
    });

    it('should pass with empty object (all fields optional)', async () => {
      const value = {};
      const result = await pipe.transform(value, createMetadata(UpdateItemDto));
      expect(result).toBeInstanceOf(UpdateItemDto);
    });

    it('should reject name longer than 200 characters', async () => {
      const value = { name: 'x'.repeat(201) };
      try {
        await pipe.transform(value, createMetadata(UpdateItemDto));
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = (error as BadRequestException).getResponse() as any;
        expect(response.message).toBe('Validation failed');
        const fields = response.errors.map((e: any) => e.field);
        expect(fields).toContain('name');
      }
    });

    it('should accept name at exactly 200 characters', async () => {
      const value = { name: 'x'.repeat(200) };
      const result = await pipe.transform(value, createMetadata(UpdateItemDto));
      expect(result.name).toHaveLength(200);
    });

    it('should reject sku longer than 50 characters', async () => {
      const value = { sku: 'S'.repeat(51) };
      try {
        await pipe.transform(value, createMetadata(UpdateItemDto));
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = (error as BadRequestException).getResponse() as any;
        const fields = response.errors.map((e: any) => e.field);
        expect(fields).toContain('sku');
      }
    });

    it('should accept sku at exactly 50 characters', async () => {
      const value = { sku: 'S'.repeat(50) };
      const result = await pipe.transform(value, createMetadata(UpdateItemDto));
      expect(result.sku).toHaveLength(50);
    });

    it('should coerce non-string name via implicit conversion', async () => {
      // GlobalValidationPipe uses enableImplicitConversion: true,
      // so number 123 becomes string "123" which passes @IsString()
      const value = { name: 123 };
      const result = await pipe.transform(value, createMetadata(UpdateItemDto));
      expect(result).toBeInstanceOf(UpdateItemDto);
      expect(result.name).toBe('123');
    });
  });

  describe('CreateMovementDto', () => {
    it('should pass with valid movement data', async () => {
      const value = { itemId: 'item-1', quantity: 10, type: 'IN' };
      const result = await pipe.transform(value, createMetadata(CreateMovementDto));
      expect(result).toBeInstanceOf(CreateMovementDto);
      expect(result.itemId).toBe('item-1');
      expect(result.quantity).toBe(10);
      expect(result.type).toBe(MovementType.IN);
    });

    it('should pass with all movement types', async () => {
      for (const type of ['IN', 'OUT', 'TRANSFER']) {
        const value = { itemId: 'item-1', quantity: 5, type };
        const result = await pipe.transform(value, createMetadata(CreateMovementDto));
        expect(result.type).toBe(type);
      }
    });

    it('should accept optional notes', async () => {
      const value = { itemId: 'item-1', quantity: 1, type: 'IN', notes: 'test note' };
      const result = await pipe.transform(value, createMetadata(CreateMovementDto));
      expect(result.notes).toBe('test note');
    });

    it('should reject missing itemId', async () => {
      const value = { quantity: 10, type: 'IN' };
      try {
        await pipe.transform(value, createMetadata(CreateMovementDto));
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = (error as BadRequestException).getResponse() as any;
        const fields = response.errors.map((e: any) => e.field);
        expect(fields).toContain('itemId');
      }
    });

    it('should reject empty itemId', async () => {
      const value = { itemId: '', quantity: 10, type: 'IN' };
      try {
        await pipe.transform(value, createMetadata(CreateMovementDto));
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = (error as BadRequestException).getResponse() as any;
        const fields = response.errors.map((e: any) => e.field);
        expect(fields).toContain('itemId');
      }
    });

    it('should reject zero quantity', async () => {
      const value = { itemId: 'item-1', quantity: 0, type: 'IN' };
      try {
        await pipe.transform(value, createMetadata(CreateMovementDto));
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = (error as BadRequestException).getResponse() as any;
        const fields = response.errors.map((e: any) => e.field);
        expect(fields).toContain('quantity');
      }
    });

    it('should reject negative quantity', async () => {
      const value = { itemId: 'item-1', quantity: -5, type: 'IN' };
      try {
        await pipe.transform(value, createMetadata(CreateMovementDto));
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = (error as BadRequestException).getResponse() as any;
        const fields = response.errors.map((e: any) => e.field);
        expect(fields).toContain('quantity');
      }
    });

    it('should reject invalid movement type', async () => {
      const value = { itemId: 'item-1', quantity: 10, type: 'INVALID' };
      try {
        await pipe.transform(value, createMetadata(CreateMovementDto));
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = (error as BadRequestException).getResponse() as any;
        const fields = response.errors.map((e: any) => e.field);
        expect(fields).toContain('type');
      }
    });

    it('should reject missing type', async () => {
      const value = { itemId: 'item-1', quantity: 10 };
      try {
        await pipe.transform(value, createMetadata(CreateMovementDto));
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = (error as BadRequestException).getResponse() as any;
        const fields = response.errors.map((e: any) => e.field);
        expect(fields).toContain('type');
      }
    });
  });

  describe('StockAdjustmentDto', () => {
    it('should pass with valid positive adjustment', async () => {
      const value = { itemId: 'item-1', delta: 10, reason: 'Restock' };
      const result = await pipe.transform(value, createMetadata(StockAdjustmentDto));
      expect(result).toBeInstanceOf(StockAdjustmentDto);
      expect(result.delta).toBe(10);
      expect(result.reason).toBe('Restock');
    });

    it('should pass with valid negative adjustment', async () => {
      const value = { itemId: 'item-1', delta: -5, reason: 'Damaged goods' };
      const result = await pipe.transform(value, createMetadata(StockAdjustmentDto));
      expect(result.delta).toBe(-5);
    });

    it('should reject zero delta', async () => {
      const value = { itemId: 'item-1', delta: 0, reason: 'No reason' };
      try {
        await pipe.transform(value, createMetadata(StockAdjustmentDto));
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = (error as BadRequestException).getResponse() as any;
        const fields = response.errors.map((e: any) => e.field);
        expect(fields).toContain('delta');
        const deltaError = response.errors.find((e: any) => e.field === 'delta');
        expect(deltaError.message).toContain('non-zero');
      }
    });

    it('should reject missing itemId', async () => {
      const value = { delta: 5, reason: 'Stock count' };
      try {
        await pipe.transform(value, createMetadata(StockAdjustmentDto));
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = (error as BadRequestException).getResponse() as any;
        const fields = response.errors.map((e: any) => e.field);
        expect(fields).toContain('itemId');
      }
    });

    it('should reject missing reason', async () => {
      const value = { itemId: 'item-1', delta: 5 };
      try {
        await pipe.transform(value, createMetadata(StockAdjustmentDto));
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = (error as BadRequestException).getResponse() as any;
        const fields = response.errors.map((e: any) => e.field);
        expect(fields).toContain('reason');
      }
    });

    it('should reject empty reason', async () => {
      const value = { itemId: 'item-1', delta: 5, reason: '' };
      try {
        await pipe.transform(value, createMetadata(StockAdjustmentDto));
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = (error as BadRequestException).getResponse() as any;
        const fields = response.errors.map((e: any) => e.field);
        expect(fields).toContain('reason');
      }
    });

    it('should reject reason longer than 500 characters', async () => {
      const value = { itemId: 'item-1', delta: 5, reason: 'r'.repeat(501) };
      try {
        await pipe.transform(value, createMetadata(StockAdjustmentDto));
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = (error as BadRequestException).getResponse() as any;
        const fields = response.errors.map((e: any) => e.field);
        expect(fields).toContain('reason');
      }
    });

    it('should accept reason at exactly 500 characters', async () => {
      const value = { itemId: 'item-1', delta: 1, reason: 'r'.repeat(500) };
      const result = await pipe.transform(value, createMetadata(StockAdjustmentDto));
      expect(result.reason).toHaveLength(500);
    });

    it('should accept reason at exactly 1 character', async () => {
      const value = { itemId: 'item-1', delta: 1, reason: 'x' };
      const result = await pipe.transform(value, createMetadata(StockAdjustmentDto));
      expect(result.reason).toBe('x');
    });

    it('should return structured error format with field and message', async () => {
      const value = { itemId: '', delta: 0, reason: '' };
      try {
        await pipe.transform(value, createMetadata(StockAdjustmentDto));
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
          expect(err.field.length).toBeGreaterThan(0);
          expect(err.message.length).toBeGreaterThan(0);
        }
      }
    });
  });
});
