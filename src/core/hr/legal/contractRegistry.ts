import type { ContractRecord } from "./contractTypes";

const KEY = "core.hr.legal.contracts";

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `contract-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const read = (): ContractRecord[] => {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as ContractRecord[]) : [];
};

const write = (items: ContractRecord[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
};

export function createContract(
  tenantId: string,
  payload: Omit<ContractRecord, "id" | "tenantId" | "createdAt" | "updatedAt">,
): ContractRecord {
  const now = new Date().toISOString();
  const record: ContractRecord = {
    ...payload,
    id: createId(),
    tenantId,
    createdAt: now,
    updatedAt: now,
  };
  write([...read(), record]);
  return record;
}

export function listContracts(tenantId: string): ContractRecord[] {
  return read().filter((item) => item.tenantId === tenantId);
}

export function updateContract(
  tenantId: string,
  contractId: string,
  patch: Partial<ContractRecord>,
): ContractRecord | undefined {
  const items = read();
  let updated: ContractRecord | undefined;
  const next = items.map((item) => {
    if (item.tenantId !== tenantId || item.id !== contractId) return item;
    updated = { ...item, ...patch, updatedAt: new Date().toISOString() };
    return updated;
  });
  if (!updated) return undefined;
  write(next);
  return updated;
}
