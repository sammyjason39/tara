import type { WorkflowGraph } from './workflow.types';

export function extractTriggerEventFromGraph(graph: WorkflowGraph): string | null {
  const trigger = graph.nodes.find((n) => n.type === 'trigger');
  const eventType = trigger?.data?.eventType;
  return eventType ? String(eventType) : null;
}

export function hasUnpublishedChanges(
  graph: unknown,
  publishedGraph: unknown,
  publishedAt: Date | null,
  updatedAt: Date,
): boolean {
  if (!publishedGraph || !publishedAt) return false;
  if (updatedAt > publishedAt) return true;
  return JSON.stringify(graph) !== JSON.stringify(publishedGraph);
}
