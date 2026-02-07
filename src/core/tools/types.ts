export type ToolCategory =
  | "documents"
  | "spreadsheets"
  | "presentations"
  | "calculators"
  | "exports";

export type ToolDefinition = {
  id: string;
  tenantId: string;
  name: string;
  category: ToolCategory;
  status: "available" | "disabled";
  createdAt: string;
  updatedAt: string;
};
