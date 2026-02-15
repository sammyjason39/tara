import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsOptional()
  opportunityId?: string;

  @IsString()
  @IsOptional()
  leadId?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  ownerId?: string;

  @IsString()
  @IsOptional()
  ownerName?: string;

  @IsString()
  @IsNotEmpty()
  dueAt: string;

  @IsString()
  @IsOptional()
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}
