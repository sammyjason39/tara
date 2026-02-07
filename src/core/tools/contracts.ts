import type { ToolDefinition } from "./types";

export type ToolContract = {
  getTools: (tenantId: string) => ToolDefinition[];
};
