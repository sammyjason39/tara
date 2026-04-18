export class CareerPath {
  id: string;
  tenant_id: string;
  from_position_id: string;
  to_position_id: string;
  requirement_notes?: string;
  created_at: Date;
  updated_at: Date;

  fromPosition?: any;
  toPosition?: any;
}
