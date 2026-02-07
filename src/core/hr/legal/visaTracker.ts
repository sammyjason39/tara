import type { VisaRecord } from "./contractTypes";

const KEY = "core.hr.legal.visas";

const read = (): VisaRecord[] => {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as VisaRecord[]) : [];
};

const write = (items: VisaRecord[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
};

export function listVisas(tenantId: string): VisaRecord[] {
  return read().filter((item) => item.tenantId === tenantId);
}

export function createVisaRecord(record: VisaRecord) {
  write([...read(), record]);
  return record;
}

export function getExpiringVisas(tenantId: string, withinDays: number): VisaRecord[] {
  const today = new Date();
  const limit = new Date();
  limit.setDate(today.getDate() + withinDays);
  return listVisas(tenantId).filter((visa) => {
    const expiry = new Date(visa.expiryDate);
    return expiry <= limit;
  });
}
