import { Session } from "@/core/security/session";

export interface OrgProfile {
  name: string;
  code: string;
  country: string;
  currency: string;
  industry: string;
}

export interface TenantPreferences {
  procurement_mode: 'DIRECT' | 'BIDDING';
  require_refund_approval?: boolean;
  dual_control_roles?: boolean;
  enable_biometric_attendance?: boolean;
}

export const orgSettingsService = {
  async getProfile(session: Session): Promise<OrgProfile> {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/v1/settings/profile`, {
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'x-tenant-id': session.tenantId,
      }
    });
    const json = await res.json();
    return json.data;
  },

  async updateProfile(session: Session, data: Partial<OrgProfile>): Promise<void> {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/v1/settings/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.token}`,
        'x-tenant-id': session.tenantId,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update profile');
  },

  async getPreferences(session: Session): Promise<TenantPreferences> {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/v1/settings/preferences`, {
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'x-tenant-id': session.tenantId,
      }
    });
    const json = await res.json();
    return json.data;
  },

  async updatePreferences(session: Session, data: Partial<TenantPreferences>): Promise<void> {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/v1/settings/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.token}`,
        'x-tenant-id': session.tenantId,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update preferences');
  }
};
