import type { ToolContract } from "./contracts";
import type { ToolDefinition } from "./types";

let activeContract: ToolContract | null = null;

export function registerToolContract(contract: ToolContract) {
  activeContract = contract;
}

export function listTools(tenantId: string): ToolDefinition[] {
  if (activeContract) {
    return activeContract.getTools(tenantId);
  }
  const now = new Date().toISOString();
  return [
    {
      id: "tool-docs",
      tenantId,
      name: "Docs",
      category: "documents",
      status: "available",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "tool-sheets",
      tenantId,
      name: "Sheets",
      category: "spreadsheets",
      status: "available",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "tool-slides",
      tenantId,
      name: "Slides",
      category: "presentations",
      status: "available",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "tool-calculators",
      tenantId,
      name: "Calculator",
      category: "calculators",
      status: "available",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "tool-exports",
      tenantId,
      name: "Exports",
      category: "exports",
      status: "available",
      createdAt: now,
      updatedAt: now,
    },
  ];
}
