export class RetailCategory {
  id: string;
  tenant_id: string;
  parent_id?: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  order: number;
  status: "active" | "inactive";
  children?: RetailCategory[];
  created_at: Date;
  updated_at: Date;
}
