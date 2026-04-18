import { IsString, IsEmail, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import { ArCustomerStatus, ArInvoiceStatus } from '../domain/ar.constants';
import { Prisma } from '@prisma/client';
import { Transform } from 'class-transformer';

export class CreateCustomerDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @Min(0)
  @Transform(({ value }) => value?.toString())
  creditLimit?: Prisma.Decimal;
}

export class CreateInvoiceDto {
  @IsString()
  customer_id: string;

  @IsString()
  invoiceNumber: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  dueDate?: Date;

  @Min(0)
  @Transform(({ value }) => value?.toString())
  total_amount: Prisma.Decimal;

  @IsOptional()
  @IsString()
  idempotency_key?: string;
}

export class CreatePaymentDto {
  @IsString()
  customer_id: string;

  @Min(0)
  @Transform(({ value }) => value?.toString())
  amount: Prisma.Decimal;

  @IsString()
  payment_method: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  idempotency_key?: string;
}

export class AllocatePaymentDto {
  @IsString()
  paymentId: string;

  @IsString()
  invoiceId: string;

  @Min(0)
  @Transform(({ value }) => value?.toString())
  amount: Prisma.Decimal;

  @IsOptional()
  @IsString()
  idempotency_key?: string;
}

export class CreateRefundDto {
  @IsString()
  paymentId: string;

  @Min(0)
  @Transform(({ value }) => value?.toString())
  amount: Prisma.Decimal;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  idempotency_key?: string;
}

export class VoidInvoiceDto {
  @IsString()
  reason: string;
}
