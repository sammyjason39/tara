import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class UpdateWorkflowStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['draft', 'active', 'paused'])
  status: 'draft' | 'active' | 'paused';
}

