export interface Holiday {
  id: string;
  tenant_id: string;
  name: string;
  date: string;
  country: string;
  isMandatory: boolean;
  created_at: Date;
  updated_at: Date;
}
