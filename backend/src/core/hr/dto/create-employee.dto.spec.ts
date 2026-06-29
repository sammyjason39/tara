import { describe, it, expect, beforeEach } from 'vitest';
import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateEmployeeDto } from './create-employee.dto';

describe('CreateEmployeeDto', () => {
  let pipe: ValidationPipe;

  const createMetadata = (metatype: any): ArgumentMetadata => ({
    type: 'body',
    metatype,
    data: '',
  });

  beforeEach(() => {
    pipe = new ValidationPipe({ transform: true, whitelist: true });
  });

  it('should pass with valid employee data', async () => {
    const value = {
      employee_code: 'EMP-001',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      department_id: 'dept-1',
      hire_date: '2025-01-01',
    };
    const result = await pipe.transform(value, createMetadata(CreateEmployeeDto));
    expect(result).toBeInstanceOf(CreateEmployeeDto);
    expect(result.first_name).toBe('John');
  });

  it('should reject first_name shorter than 2 characters', async () => {
    const value = {
      employee_code: 'EMP-001',
      first_name: 'J',
      last_name: 'Doe',
      email: 'j@example.com',
      department_id: 'dept-1',
      hire_date: '2025-01-01',
    };
    try {
      await pipe.transform(value, createMetadata(CreateEmployeeDto));
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as any;
      const fields = response.errors.map((e: any) => e.field);
      expect(fields).toContain('first_name');
    }
  });

  it('should reject first_name longer than 100 characters', async () => {
    const value = {
      employee_code: 'EMP-001',
      first_name: 'a'.repeat(101),
      last_name: 'Doe',
      email: 'test@example.com',
      department_id: 'dept-1',
      hire_date: '2025-01-01',
    };
    try {
      await pipe.transform(value, createMetadata(CreateEmployeeDto));
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as any;
      const fields = response.errors.map((e: any) => e.field);
      expect(fields).toContain('first_name');
    }
  });

  it('should reject invalid email', async () => {
    const value = {
      employee_code: 'EMP-001',
      first_name: 'John',
      last_name: 'Doe',
      email: 'not-an-email',
      department_id: 'dept-1',
      hire_date: '2025-01-01',
    };
    try {
      await pipe.transform(value, createMetadata(CreateEmployeeDto));
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as any;
      const fields = response.errors.map((e: any) => e.field);
      expect(fields).toContain('email');
    }
  });

  it('should reject missing department_id', async () => {
    const value = {
      employee_code: 'EMP-001',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      hire_date: '2025-01-01',
    };
    try {
      await pipe.transform(value, createMetadata(CreateEmployeeDto));
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as any;
      const fields = response.errors.map((e: any) => e.field);
      expect(fields).toContain('department_id');
    }
  });

  it('should return structured error format', async () => {
    const value = {};
    try {
      await pipe.transform(value, createMetadata(CreateEmployeeDto));
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
