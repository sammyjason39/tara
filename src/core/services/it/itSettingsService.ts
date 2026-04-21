import { apiRequest } from "@/core/api/apiClient";
import type { SessionContext } from "@/core/security/session";

export interface ITDevice {
  id: string;
  tenantId: string;
  locationId: string;
  deviceType: string;
  deviceName: string;
  ipAddress?: string;
  macAddress?: string;
  status: string;
  lastSeen: string;
  metadata?: any;
}

export interface ITSetting {
  id: string;
  tenantId: string;
  key: string;
  value: string;
  category: string;
  isPublic: boolean;
  description?: string;
}

export const itSettingsService = {
  async getDevices(
    tenantId: string,
    session: SessionContext,
    locationId?: string,
  ): Promise<ITDevice[]> {
    const searchParams = new URLSearchParams();
    if (locationId) searchParams.append("locationId", locationId);
    const queryString = searchParams.toString();
    const url = `/it-settings/devices${queryString ? `?${queryString}` : ""}`;
    return apiRequest<ITDevice[]>(url, "GET", session);
  },

  async registerDevice(
    tenantId: string,
    session: SessionContext,
    data: any,
  ): Promise<ITDevice> {
    return apiRequest<ITDevice>("/v1/it-settings/devices", "POST", session, data);
  },

  async updateDeviceStatus(
    tenantId: string,
    session: SessionContext,
    deviceId: string,
    status: string,
  ): Promise<ITDevice> {
    return apiRequest<ITDevice>(
      `/it-settings/devices/${deviceId}/status`,
      "PUT",
      session,
      { status },
    );
  },

  async getSettings(
    tenantId: string,
    session: SessionContext,
    category?: string,
  ): Promise<ITSetting[]> {
    const searchParams = new URLSearchParams();
    if (category) searchParams.append("category", category);
    const queryString = searchParams.toString();
    const url = `/it-settings/settings${queryString ? `?${queryString}` : ""}`;
    return apiRequest<ITSetting[]>(url, "GET", session);
  },

  async updateSetting(
    tenantId: string,
    session: SessionContext,
    key: string,
    data: any,
  ): Promise<ITSetting> {
    return apiRequest<ITSetting>(
      `/it-settings/settings/${key}`,
      "PUT",
      session,
      data,
    );
  },
};

