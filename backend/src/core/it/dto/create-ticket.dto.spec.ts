import { describe, it, expect, beforeEach } from 'vitest';
import { GlobalValidationPipe } from '../../../shared/pipes/global-validation.pipe';
import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { CreateTicketDto } from './create-ticket.dto';

describe('CreateTicketDto', () => {
  let pipe: GlobalValidationPipe;

  const createMetadata = (metatype: any): ArgumentMetadata => ({
    type: 'body',
    metatype,
    data: '',
  });

  beforeEach(() => {
    pipe = new GlobalValidationPipe();
  });

  it('should pass with valid ticket data', async () => {
    const value = {
      title: 'Cannot access email',
      description: 'Email client shows connection error',
      category: 'software',
      impact: 'MEDIUM',
    };
    const result = await pipe.transform(value, createMetadata(CreateTicketDto));
    expect(result).toBeInstanceOf(CreateTicketDto);
    expect(result.title).toBe('Cannot access email');
    expect(result.impact).toBe('MEDIUM');
  });

  it('should reject title shorter than 5 characters', async () => {
    const value = {
      title: 'Hi',
      description: 'Some description',
      category: 'hardware',
      impact: 'LOW',
    };
    try {
      await pipe.transform(value, createMetadata(CreateTicketDto));
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as any;
      const fields = response.errors.map((e: any) => e.field);
      expect(fields).toContain('title');
    }
  });

  it('should reject title longer than 200 characters', async () => {
    const value = {
      title: 'x'.repeat(201),
      description: 'Some description',
      category: 'network',
      impact: 'HIGH',
    };
    try {
      await pipe.transform(value, createMetadata(CreateTicketDto));
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as any;
      const fields = response.errors.map((e: any) => e.field);
      expect(fields).toContain('title');
    }
  });

  it('should accept title at exactly 5 characters', async () => {
    const value = {
      title: 'Hello',
      description: 'Test description',
      category: 'software',
      impact: 'LOW',
    };
    const result = await pipe.transform(value, createMetadata(CreateTicketDto));
    expect(result.title).toBe('Hello');
  });

  it('should reject invalid impact value', async () => {
    const value = {
      title: 'Valid title here',
      description: 'Some description',
      category: 'software',
      impact: 'URGENT',
    };
    try {
      await pipe.transform(value, createMetadata(CreateTicketDto));
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as any;
      const fields = response.errors.map((e: any) => e.field);
      expect(fields).toContain('impact');
    }
  });

  it('should reject invalid category', async () => {
    const value = {
      title: 'Valid title here',
      description: 'Some description',
      category: 'invalid_category',
      impact: 'LOW',
    };
    try {
      await pipe.transform(value, createMetadata(CreateTicketDto));
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as any;
      const fields = response.errors.map((e: any) => e.field);
      expect(fields).toContain('category');
    }
  });

  it('should reject missing description', async () => {
    const value = {
      title: 'Valid title',
      category: 'hardware',
      impact: 'LOW',
    };
    try {
      await pipe.transform(value, createMetadata(CreateTicketDto));
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as any;
      const fields = response.errors.map((e: any) => e.field);
      expect(fields).toContain('description');
    }
  });

  it('should return structured error format', async () => {
    const value = {};
    try {
      await pipe.transform(value, createMetadata(CreateTicketDto));
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
