import type { AttendanceDevice, AttendancePolicy, AttendanceRecord, WorkplaceLocation, AttendanceEvent } from "@/core/types/hr/attendance";
import { ensureSeed, saveToStorage } from "./storage";

const RECORDS_KEY = (tenantId: string) => `hr:${tenantId}:attendance:records`;

const MOCK_POLICY: AttendancePolicy = {
  id: "policy-global",
  tenantId: "tenant-demo",
  name: "Standard Global Policy",
  gracePeriodMinutes: 15,
  lateThresholdMinutes: 60,
  requirePhotoProof: false,
  requireLocation: true,
  autoCheckout: true,
};

const MOCK_LOCATIONS: WorkplaceLocation[] = [
  {
    id: "loc-hq",
    tenantId: "tenant-demo",
    name: "Global HQ",
    address: "123 Business Park, Metro City",
    coordinates: { lat: -6.2088, lng: 106.8456 },
    geofenceRadius: 100,
  },
  {
    id: "loc-store-001",
    tenantId: "tenant-demo",
    name: "Downtown Store",
    address: "456 Retail Blvd",
    coordinates: { lat: -6.2250, lng: 106.8000 },
    geofenceRadius: 50,
  },
];

const MOCK_DEVICES: AttendanceDevice[] = [
  {
    id: "dev-kiosk-hq",
    tenantId: "tenant-demo",
    name: "HQ Front Desk Kiosk",
    type: "kiosk",
    locationId: "loc-hq",
    isActive: true,
  },
  {
    id: "dev-mobile",
    tenantId: "tenant-demo",
    name: "Zenvix Mobile App",
    type: "mobile",
    isActive: true,
  },
];

const SEED_RECORDS = (tenantId: string): AttendanceRecord[] => [
  {
    id: `${tenantId}-att-001`,
    tenantId,
    employeeId: `${tenantId}-emp-001`,
    date: "2026-02-05",
    shiftId: "shift-morning",
    policyId: "policy-global",
    status: "on_time",
    workDurationMinutes: 480,
    abnormalTags: [],
    requiresAttention: false,
    checkIn: {
      id: "evt-001-in",
      tenantId,
      employeeId: `${tenantId}-emp-001`,
      timestamp: "2026-02-05T08:58:00.000Z",
      type: "check_in",
      locationId: "loc-hq",
      deviceId: "dev-kiosk-hq",
      verificationMethod: "biometric",
    },
    checkOut: {
      id: "evt-001-out",
      tenantId,
      employeeId: `${tenantId}-emp-001`,
      timestamp: "2026-02-05T17:10:00.000Z",
      type: "check_out",
      locationId: "loc-hq",
      deviceId: "dev-kiosk-hq",
      verificationMethod: "biometric",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: `${tenantId}-att-002`,
    tenantId,
    employeeId: `${tenantId}-emp-002`,
    date: "2026-02-05",
    shiftId: "shift-morning",
    policyId: "policy-global",
    status: "late",
    workDurationMinutes: 0,
    abnormalTags: ["late"],
    requiresAttention: true,
    checkIn: {
      id: "evt-002-in",
      tenantId,
      employeeId: `${tenantId}-emp-002`,
      timestamp: "2026-02-05T09:23:00.000Z",
      type: "check_in",
      locationId: "loc-hq",
      deviceId: "dev-mobile",
      verificationMethod: "gps",
      coordinates: { lat: -6.2088, lng: 106.8456 },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const attendanceRepo = {
  getPolicy(tenantId: string): AttendancePolicy {
    return { ...MOCK_POLICY, tenantId };
  },

  listLocations(tenantId: string): WorkplaceLocation[] {
    return MOCK_LOCATIONS.map((l) => ({ ...l, tenantId }));
  },

  getLocation(tenantId: string, locationId: string): WorkplaceLocation | undefined {
    return this.listLocations(tenantId).find((l) => l.id === locationId);
  },

  getDevice(tenantId: string, deviceId: string): AttendanceDevice | undefined {
    const devices = MOCK_DEVICES.map((d) => ({ ...d, tenantId }));
    return devices.find((d) => d.id === deviceId);
  },

  list(tenantId: string): AttendanceRecord[] {
    return this.listRecords(tenantId);
  },

  listRecords(tenantId: string): AttendanceRecord[] {
    return ensureSeed(RECORDS_KEY(tenantId), SEED_RECORDS(tenantId));
  },

  getRecord(tenantId: string, employeeId: string, date: string): AttendanceRecord | undefined {
    const records = this.listRecords(tenantId);
    return records.find((r) => r.employeeId === employeeId && r.date === date);
  },

  saveRecord(tenantId: string, record: AttendanceRecord): void {
    const records = this.listRecords(tenantId).filter((r) => r.id !== record.id);
    const updated = [...records, record];
    saveToStorage(RECORDS_KEY(tenantId), updated);
  },
};
