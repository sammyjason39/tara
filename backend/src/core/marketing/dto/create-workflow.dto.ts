import { IsArray, IsIn, IsNotEmpty, IsString } from 'class-validator';

export type WorkflowStepInput = {
  id: string;
  order: number;
  channel: 'email' | 'whatsapp' | 'retargeting';
  waitHours: number;
  messageTemplate: string;
};

export class CreateWorkflowDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsIn(['new_lead', 'score_below_threshold', 'reengagement'])
  trigger: 'new_lead' | 'score_below_threshold' | 'reengagement';

  @IsArray()
  steps: WorkflowStepInput[];
}

