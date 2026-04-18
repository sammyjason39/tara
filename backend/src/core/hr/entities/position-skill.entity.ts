export class PositionSkill {
  id: string;
  tenant_id: string;
  position_id: string;
  skill_id: string;
  minProficiency: number;
  isMandatory: boolean;
  created_at: Date;
  updated_at: Date;

  position?: any;
  skill?: any;
}
