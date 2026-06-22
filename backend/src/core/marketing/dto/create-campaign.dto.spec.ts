import { describe, it, expect, beforeEach } from 'vitest';
import { GlobalValidationPipe } from '../../../shared/pipes/global-validation.pipe';
import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { CreateCampaignDto } from './create-campaign.dto';

describe('CreateCampaignDto', () => {
  let pipe: GlobalValidationPipe;

  const createMetadata = (metatype: any): ArgumentMetadata => ({
    type: 'body',
    metatype,
    data: '',
  });

  beforeEach(() => {
    pipe = new GlobalValidationPipe();
  });

  it('should pass with valid campaign data', async () => {
    const value = {
      name: 'Summer Sale',
      objective: 'lead_generation',
      channel_mix: ['email'],
      budget: 5000,
      start_date: '2025-06-01',
      end_date: '2025-06-30',
      audience: 'Premium customers',
      audienceSegments: ['premium', 'returning'],
    };
    const result = await pipe.transform(value, createMetadata(CreateCampaignDto));
    expect(result).toBeInstanceOf(CreateCampaignDto);
    expect(result.name).toBe('Summer Sale');
  });

  it('should reject name shorter than 3 characters', async () => {
    const value = {
      name: 'AB',
      objective: 'awareness',
      channel_mix: ['email'],
      budget: 100,
      start_date: '2025-01-01',
      end_date: '2025-01-31',
      audience: 'All',
    };
    try {
      await pipe.transform(value, createMetadata(CreateCampaignDto));
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as any;
      const fields = response.errors.map((e: any) => e.field);
      expect(fields).toContain('name');
    }
  });

  it('should reject name longer than 100 characters', async () => {
    const value = {
      name: 'x'.repeat(101),
      objective: 'awareness',
      channel_mix: ['email'],
      budget: 100,
      start_date: '2025-01-01',
      end_date: '2025-01-31',
      audience: 'All',
    };
    try {
      await pipe.transform(value, createMetadata(CreateCampaignDto));
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as any;
      const fields = response.errors.map((e: any) => e.field);
      expect(fields).toContain('name');
    }
  });

  it('should accept name at exactly 3 characters', async () => {
    const value = {
      name: 'ABC',
      objective: 'nurture',
      channel_mix: ['whatsapp'],
      budget: 50,
      start_date: '2025-01-01',
      end_date: '2025-01-31',
      audience: 'Test',
    };
    const result = await pipe.transform(value, createMetadata(CreateCampaignDto));
    expect(result.name).toBe('ABC');
  });

  it('should reject empty audienceSegments when provided', async () => {
    const value = {
      name: 'Valid Campaign',
      objective: 'remarketing',
      channel_mix: ['meta_ads'],
      budget: 1000,
      start_date: '2025-02-01',
      end_date: '2025-02-28',
      audience: 'All',
      audienceSegments: [],
    };
    try {
      await pipe.transform(value, createMetadata(CreateCampaignDto));
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as any;
      const fields = response.errors.map((e: any) => e.field);
      expect(fields).toContain('audienceSegments');
    }
  });

  it('should pass without audienceSegments (optional)', async () => {
    const value = {
      name: 'Valid Campaign',
      objective: 'awareness',
      channel_mix: ['google_ads'],
      budget: 2000,
      start_date: '2025-03-01',
      end_date: '2025-03-31',
      audience: 'General',
    };
    const result = await pipe.transform(value, createMetadata(CreateCampaignDto));
    expect(result).toBeInstanceOf(CreateCampaignDto);
  });

  it('should return structured error format', async () => {
    const value = { name: '' };
    try {
      await pipe.transform(value, createMetadata(CreateCampaignDto));
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
