export class Skill {
  id: string;
  tenant_id: string;
  name: string;
  category: string; // TECHNICAL, SOFT, LEADERSHIP
  description?: string;
  created_at: Date;
  updated_at: Date;
}
