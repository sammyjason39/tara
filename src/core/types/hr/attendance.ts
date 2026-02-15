import type { HRAuditFields } from "./base";

export type AttendanceStatus = "on_time" | "late" | "absent" | "remote" | "leave" | "early_leave" | "missing_out";

export interface WorkplaceLocation {
  id: string;
  tenantId: string;
  name: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  geofenceRadius: number; // meters
}

export interface AttendanceDevice {
  id: string;
  tenantId: string;
  name: string;
  type: "kiosk" | "mobile" | "biometric" | "web";
  locationId?: string; // If fixed to a location
  isActive: boolean;
}

export interface AttendancePolicy {
  id: string;
  tenantId: string;
  name: string;
  gracePeriodMinutes: number;
  lateThresholdMinutes: number; // Mark as absent if later than this
  requirePhotoProof: boolean;
  requireLocation: boolean;
  autoCheckout: boolean;
}

export interface AttendanceEvent {
  id: string;
  tenantId: string;
  employeeId: string;
  timestamp: string; // ISO
  type: "check_in" | "check_out" | "break_start" | "break_end";
  locationId: string;
  deviceId: string;
  ipAddress?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  verificationMethod: "gps" | "biometric" | "manual" | "trusted_device";
  isOfflineSync?: boolean;
}

export interface AttendanceRecord extends HRAuditFields {
  id: string;
  tenantId: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  shiftId: string;
  policyId: string;
  checkIn?: AttendanceEvent;
  checkOut?: AttendanceEvent;
  status: AttendanceStatus;
  abnormalTags: string[]; // ["late", "location_mismatch"]
  workDurationMinutes: number;
  requiresAttention: boolean;
}
