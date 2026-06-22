import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum TicketImpact {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum TicketCategory {
  HARDWARE = 'hardware',
  SOFTWARE = 'software',
  NETWORK = 'network',
  SECURITY = 'security',
  ACCESS = 'access',
  OTHER = 'other',
}

/**
 * CreateTicketDto
 *
 * Validates IT support ticket creation.
 *
 * Constraints:
 * - title: required, 5-200 characters
 * - description: required, non-empty
 * - category: required, must be a valid TicketCategory
 * - impact: required, must be LOW/MEDIUM/HIGH/CRITICAL
 *
 * Validates: Requirements 6.2, 16.2, 17.7
 */
export class CreateTicketDto {
  @IsString()
  @IsNotEmpty({ message: 'title is required' })
  @MinLength(5, { message: 'title must be at least 5 characters' })
  @MaxLength(200, { message: 'title must be at most 200 characters' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'description is required' })
  description: string;

  @IsEnum(TicketCategory, {
    message: 'category must be one of: hardware, software, network, security, access, other',
  })
  category: TicketCategory;

  @IsEnum(TicketImpact, {
    message: 'impact must be one of: LOW, MEDIUM, HIGH, CRITICAL',
  })
  impact: TicketImpact;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsString()
  reporterId?: string;

  @IsOptional()
  @IsString()
  priority?: string;
}
