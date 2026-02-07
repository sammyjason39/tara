import type { Role } from "@/core/security/roles";

export type ToolFileType = "doc" | "sheet" | "slide" | "pdf";

export type ToolFolder = {
  id: string;
  tenantId: string;
  departmentId: string;
  name: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
};

export type ToolFileRecord = {
  id: string;
  tenantId: string;
  departmentId: string;
  ownerId: string;
  folderId?: string;
  name: string;
  type: ToolFileType;
  content: string;
  allowedRoles?: Role[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};
