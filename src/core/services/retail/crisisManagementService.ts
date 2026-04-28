import { apiRequest } from "@/core/api/apiClient";
import type { SessionContext } from "@/core/security/session";

export interface CrisisAlert {
  id: string;
  type: "INFRA_FAILURE" | "STAFFING_SHORTAGE" | "STOCKOUT_RISK" | "SECURITY_BREACH";
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  message: string;
  location_id: string;
  timestamp: string;
  resolved: boolean;
  resolution_task_id?: string;
}

export interface DeploymentTask {
  id: string;
  title: string;
  description: string;
  target_location: string;
  priority: "URGENT" | "HIGH" | "STANDARD";
  status: "PENDING" | "ACTIVE" | "COMPLETED";
  assigned_assets: string[];
}

export const crisisManagementService = {
  /**
   * Get all active alerts across the tenant scope
   */
  async getActiveAlerts(session: SessionContext): Promise<CrisisAlert[]> {
    return apiRequest<CrisisAlert[]>("/v1/retail/crisis/alerts", "GET", session);
  },

  /**
   * Trigger a resource deployment task to resolve an anomaly
   */
  async deployResources(
    session: SessionContext, 
    alertId: string, 
    assets: string[]
  ): Promise<{ success: boolean; taskId: string }> {
    return apiRequest<{ success: boolean; taskId: string }>(
      "/v1/retail/crisis/deploy", 
      "POST", 
      session, 
      { alertId, assets }
    );
  },

  /**
   * Get task status for a deployment
   */
  async getDeploymentStatus(session: SessionContext, taskId: string): Promise<DeploymentTask> {
    return apiRequest<DeploymentTask>(`/v1/retail/crisis/tasks/${taskId}`, "GET", session);
  },

  /**
   * Automate replenishment for a specific location
   */
  async triggerAutoReplenishment(
    session: SessionContext, 
    locationId: string, 
    skus: string[]
  ): Promise<{ success: boolean; orderId: string }> {
    return apiRequest<{ success: boolean; orderId: string }>(
      "/v1/retail/crisis/replenish", 
      "POST", 
      session, 
      { locationId, skus }
    );
  }
};
