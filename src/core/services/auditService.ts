import { apiRequest } from "@/core/api/apiClient";
import type { SessionContext } from "@/core/security/session";

export interface AuditLog {
  id: string;
  created_at: string;
  user_id: string;
  module: string;
  action: string;
  entity_type: string;
  entity_id: string;
  severity: "INFO" | "WARN" | "CRITICAL";
  metadata: any;
  hash_chain?: string;
  previous_hash?: string;
}

export interface VerificationResult {
  valid: boolean;
  checkedRecords: number;
  firstInvalidRecord?: {
    id: string;
    action: string;
    expectedPrevHash: string;
    actualPrevHash: string;
  };
  lastValidHash: string;
}

export const auditService = {
  /**
   * Query audit logs with filters
   */
  async getLogs(session: SessionContext, filters: any = {}): Promise<{ data: AuditLog[]; total: number }> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val) params.append(key, String(val));
    });
    const query = params.toString() ? `?${params.toString()}` : "";
    return apiRequest<{ data: AuditLog[]; total: number }>(`/v1/audit/logs${query}`, "GET", session);
  },

  /**
   * Verify the integrity of the audit chain
   */
  async verifyChain(session: SessionContext, fromTimestamp?: string): Promise<VerificationResult> {
    const query = fromTimestamp ? `?fromTimestamp=${fromTimestamp}` : "";
    return apiRequest<VerificationResult>(`/v1/audit/verify-chain${query}`, "GET", session);
  },

  /**
   * Request a repair of the audit chain (Requires user-initiated context)
   */
  async repairChain(session: SessionContext): Promise<{ success: boolean; message: string }> {
    return apiRequest<{ success: boolean; message: string }>("/v1/audit/repair", "POST", session, {});
  },

  /**
   * Get audit write metrics and latency
   */
  async getMetrics(session: SessionContext) {
    return apiRequest<any>("/v1/audit/system/metrics", "GET", session);
  }
};
