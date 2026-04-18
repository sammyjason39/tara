/**
 * OrchestrationHook
 * Phase 5 — Global Orchestration Hooks
 * 
 * Defines standard extension points for multi-agent coordination.
 * Implementations should be non-blocking.
 */
export interface OrchestrationHook {
  /**
   * Called before a recommendation is persisted.
   * Can be used for cross-agent validation or suppression.
   */
  beforeRecommendation?(tenant_id: string, insightId: string, data: any): Promise<void> | void;

  /**
   * Called before an autonomous or suggested action is triggered.
   */
  beforeAction?(tenant_id: string, actionType: string, payload: any): Promise<void> | void;

  /**
   * Called after an insight is generated.
   */
  afterInsight?(tenant_id: string, insightId: string, type: string): Promise<void> | void;
}
