import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, validateSync, IsUrl } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  PORT: number = 3001;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  STRIPE_SECRET_KEY: string;

  @IsString()
  STRIPE_WEBHOOK_SECRET: string;

  @IsUrl({ require_tld: false })
  FRONTEND_URL: string;

  // Optional Gateway Keys
  @IsString()
  @IsOptional()
  XENDIT_API_KEY?: string;

  @IsString()
  @IsOptional()
  MIDTRANS_SERVER_KEY?: string;

  // Infrastructure Flags
  @IsString()
  @IsOptional()
  VERCEL?: string;

  @IsString()
  @IsOptional()
  IS_WORKER?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(`[ENV_VALIDATION_ERROR] Check your .env file: ${errors.toString()}`);
  }
  return validatedConfig;
}
