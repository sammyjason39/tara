import type { ToolFileRecord, ToolFolder } from "./types";

const FILE_KEY = "core.tools.files";
const FOLDER_KEY = "core.tools.folders";

const readFiles = (): ToolFileRecord[] => {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(FILE_KEY);
  return raw ? (JSON.parse(raw) as ToolFileRecord[]) : [];
};

const writeFiles = (items: ToolFileRecord[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FILE_KEY, JSON.stringify(items));
};

const readFolders = (): ToolFolder[] => {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(FOLDER_KEY);
  return raw ? (JSON.parse(raw) as ToolFolder[]) : [];
};

const writeFolders = (items: ToolFolder[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FOLDER_KEY, JSON.stringify(items));
};

export const toolFileRepo = {
  list(): ToolFileRecord[] {
    return readFiles();
  },

  create(record: ToolFileRecord): ToolFileRecord {
    writeFiles([record, ...readFiles()]);
    return record;
  },

  update(record: ToolFileRecord): ToolFileRecord {
    const next = readFiles().map((item) => (item.id === record.id ? record : item));
    writeFiles(next);
    return record;
  },
};

export const toolFolderRepo = {
  list(): ToolFolder[] {
    return readFolders();
  },

  create(record: ToolFolder): ToolFolder {
    writeFolders([record, ...readFolders()]);
    return record;
  },

  update(record: ToolFolder): ToolFolder {
    const next = readFolders().map((item) => (item.id === record.id ? record : item));
    writeFolders(next);
    return record;
  },
};
