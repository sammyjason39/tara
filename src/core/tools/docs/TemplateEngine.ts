export type TemplateToken = {
  key: string;
  label: string;
};

export const contractTemplates = [
  {
    id: "tpl-employment",
    name: "Employment Contract",
    tokens: [
      { key: "employee_name", label: "Employee Name" },
      { key: "role_title", label: "Role Title" },
      { key: "start_date", label: "Start Date" },
    ],
  },
  {
    id: "tpl-vendor",
    name: "Vendor Agreement",
    tokens: [
      { key: "vendor_name", label: "Vendor Name" },
      { key: "service_scope", label: "Service Scope" },
      { key: "effective_date", label: "Effective Date" },
    ],
  },
] as const;

export function buildTemplatePreview(templateId: string) {
  const template = contractTemplates.find((tpl) => tpl.id === templateId);
  if (!template) return "Template not found.";
  return `Template: ${template.name}\nTokens:\n${template.tokens
    .map((token) => `- ${token.label} (${token.key})`)
    .join("\n")}`;
}
