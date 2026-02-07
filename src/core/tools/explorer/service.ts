import type { ToolFileRecord, ToolFileType, ToolFolder } from "./types";
import { toolFileRepo, toolFolderRepo } from "./repository";
import type { SessionContext } from "@/core/security/session";
import { Roles } from "@/core/security/roles";
import { logAction } from "@/core/logging/audit";

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `file-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const canSeeFile = (session: SessionContext, file: ToolFileRecord) => {
  if (session.role === Roles.SUPERADMIN) return true;
  if (file.tenantId !== session.tenantId) return false;
  if (([Roles.OWNER, Roles.COMPANY_ADMIN] as readonly string[]).includes(session.role)) return true;
  if (session.role === Roles.DEPT_HEAD || session.role === Roles.HR_ADMIN || session.role === Roles.FINANCE_ADMIN) {
    return file.departmentId === session.departmentId;
  }
  return file.departmentId === session.departmentId && file.ownerId === session.userId;
};

const canManageFile = (session: SessionContext, file: ToolFileRecord) => {
  if (session.role === Roles.SUPERADMIN) return true;
  if (file.tenantId !== session.tenantId) return false;
  if (([Roles.OWNER, Roles.COMPANY_ADMIN] as readonly string[]).includes(session.role)) return true;
  if (([Roles.DEPT_HEAD, Roles.HR_ADMIN, Roles.FINANCE_ADMIN] as readonly string[]).includes(session.role)) {
    return file.departmentId === session.departmentId;
  }
  return file.departmentId === session.departmentId && file.ownerId === session.userId;
};

const canManageFolders = (session: SessionContext) => {
  return ([
    Roles.SUPERADMIN,
    Roles.OWNER,
    Roles.COMPANY_ADMIN,
    Roles.DEPT_HEAD,
    Roles.HR_ADMIN,
    Roles.FINANCE_ADMIN,
  ] as readonly string[]).includes(session.role);
};

export function listFiles(tenantId: string, session: SessionContext, type?: ToolFileType) {
  return toolFileRepo
    .list()
    .filter((file) => file.tenantId === tenantId)
    .filter((file) => !file.deletedAt)
    .filter((file) => (type ? file.type === type : true))
    .filter((file) => canSeeFile(session, file));
}

export function searchFiles(
  tenantId: string,
  session: SessionContext,
  query: string,
  type?: ToolFileType,
) {
  const lower = query.toLowerCase();
  return listFiles(tenantId, session, type).filter((file) =>
    file.name.toLowerCase().includes(lower),
  );
}

export function listRecycleBin(tenantId: string, session: SessionContext, type?: ToolFileType) {
  if (!([Roles.SUPERADMIN, Roles.OWNER, Roles.COMPANY_ADMIN] as readonly string[]).includes(session.role)) {
    return [];
  }
  return toolFileRepo
    .list()
    .filter((file) => file.tenantId === tenantId)
    .filter((file) => Boolean(file.deletedAt))
    .filter((file) => (type ? file.type === type : true));
}

export function listFolders(tenantId: string, session: SessionContext): ToolFolder[] {
  if (!canManageFolders(session)) return [];
  return toolFolderRepo
    .list()
    .filter((folder) => folder.tenantId === tenantId)
    .filter((folder) => folder.departmentId === session.departmentId);
}

export function createFolder(
  tenantId: string,
  session: SessionContext,
  name: string,
  parentId?: string,
): ToolFolder | undefined {
  if (!canManageFolders(session)) return undefined;
  const now = new Date().toISOString();
  const folder: ToolFolder = {
    id: createId(),
    tenantId,
    departmentId: session.departmentId,
    name,
    parentId,
    createdAt: now,
    updatedAt: now,
  };
  toolFolderRepo.create(folder);
  logAction({
    actor: { userId: session.userId, role: session.role, departmentId: session.departmentId },
    tenantId,
    entityType: "tool_folder",
    actionType: "create",
    metadata: { folderId: folder.id },
  });
  return folder;
}

export function renameFolder(
  tenantId: string,
  session: SessionContext,
  folderId: string,
  name: string,
): ToolFolder | undefined {
  if (!canManageFolders(session)) return undefined;
  const current = toolFolderRepo.list().find((folder) => folder.id === folderId && folder.tenantId === tenantId);
  if (!current) return undefined;
  const updated = { ...current, name, updatedAt: new Date().toISOString() };
  toolFolderRepo.update(updated);
  logAction({
    actor: { userId: session.userId, role: session.role, departmentId: session.departmentId },
    tenantId,
    entityType: "tool_folder",
    actionType: "rename",
    metadata: { folderId: updated.id },
  });
  return updated;
}

export function moveFolder(
  tenantId: string,
  session: SessionContext,
  folderId: string,
  parentId?: string,
): ToolFolder | undefined {
  if (!canManageFolders(session)) return undefined;
  const current = toolFolderRepo.list().find((folder) => folder.id === folderId && folder.tenantId === tenantId);
  if (!current) return undefined;
  const updated: ToolFolder = {
    ...current,
    parentId,
    updatedAt: new Date().toISOString(),
  };
  toolFolderRepo.update(updated);
  logAction({
    actor: { userId: session.userId, role: session.role, departmentId: session.departmentId },
    tenantId,
    entityType: "tool_folder",
    actionType: "move",
    metadata: { folderId: updated.id, parentId: parentId ?? "root" },
  });
  return updated;
}

export function createFile(
  tenantId: string,
  session: SessionContext,
  payload: { name: string; type: ToolFileType; content: string; folderId?: string },
): ToolFileRecord {
  const now = new Date().toISOString();
  const record: ToolFileRecord = {
    id: createId(),
    tenantId,
    departmentId: session.departmentId,
    ownerId: session.userId,
    folderId: payload.folderId ?? "root",
    name: payload.name,
    type: payload.type,
    content: payload.content,
    createdAt: now,
    updatedAt: now,
  };
  toolFileRepo.create(record);
  logAction({
    actor: { userId: session.userId, role: session.role, departmentId: session.departmentId },
    tenantId,
    entityType: "tool_file",
    actionType: "create",
    metadata: { fileId: record.id, type: record.type },
  });
  return record;
}

export function updateFile(
  tenantId: string,
  session: SessionContext,
  fileId: string,
  patch: Partial<Pick<ToolFileRecord, "name" | "content">>,
) {
  const current = toolFileRepo.list().find((file) => file.id === fileId && file.tenantId === tenantId);
  if (!current || !canManageFile(session, current)) return undefined;
  const updated: ToolFileRecord = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  toolFileRepo.update(updated);
  logAction({
    actor: { userId: session.userId, role: session.role, departmentId: session.departmentId },
    tenantId,
    entityType: "tool_file",
    actionType: "update",
    metadata: { fileId: updated.id },
  });
  return updated;
}

export function moveToRecycle(
  tenantId: string,
  session: SessionContext,
  fileId: string,
) {
  const current = toolFileRepo.list().find((file) => file.id === fileId && file.tenantId === tenantId);
  if (!current || !canManageFile(session, current)) return undefined;
  const updated: ToolFileRecord = {
    ...current,
    deletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  toolFileRepo.update(updated);
  logAction({
    actor: { userId: session.userId, role: session.role, departmentId: session.departmentId },
    tenantId,
    entityType: "tool_file",
    actionType: "delete",
    metadata: { fileId: updated.id },
  });
  return updated;
}

export function restoreFromRecycle(
  tenantId: string,
  session: SessionContext,
  fileId: string,
) {
  if (!([Roles.SUPERADMIN, Roles.OWNER, Roles.COMPANY_ADMIN] as readonly string[]).includes(session.role)) {
    return undefined;
  }
  const current = toolFileRepo.list().find((file) => file.id === fileId && file.tenantId === tenantId);
  if (!current) return undefined;
  const updated: ToolFileRecord = {
    ...current,
    deletedAt: undefined,
    updatedAt: new Date().toISOString(),
  };
  toolFileRepo.update(updated);
  logAction({
    actor: { userId: session.userId, role: session.role, departmentId: session.departmentId },
    tenantId,
    entityType: "tool_file",
    actionType: "restore",
    metadata: { fileId: updated.id },
  });
  return updated;
}

export function moveFile(
  tenantId: string,
  session: SessionContext,
  fileId: string,
  folderId: string,
) {
  const current = toolFileRepo.list().find((file) => file.id === fileId && file.tenantId === tenantId);
  if (!current || !canManageFile(session, current)) return undefined;
  const updated: ToolFileRecord = {
    ...current,
    folderId,
    updatedAt: new Date().toISOString(),
  };
  toolFileRepo.update(updated);
  logAction({
    actor: { userId: session.userId, role: session.role, departmentId: session.departmentId },
    tenantId,
    entityType: "tool_file",
    actionType: "move",
    metadata: { fileId: updated.id, folderId },
  });
  return updated;
}

export function renameFile(
  tenantId: string,
  session: SessionContext,
  fileId: string,
  name: string,
) {
  return updateFile(tenantId, session, fileId, { name });
}
