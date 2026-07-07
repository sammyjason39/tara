import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { workflowNodeTypes } from "./WorkflowNodes";

export type WorkflowGraph = {
  nodes: Array<{
    id: string;
    type: "trigger" | "condition" | "action";
    position: { x: number; y: number };
    data: Record<string, unknown>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
  }>;
};

type Props = {
  graph: WorkflowGraph;
  onChange: (graph: WorkflowGraph) => void;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
};

export function WorkflowCanvas({ graph, onChange, selectedNodeId, onSelectNode }: Props) {
  const initialNodes = useMemo(
    () =>
      graph.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
        selected: n.id === selectedNodeId,
      })) as Node[],
    [graph.nodes, selectedNodeId],
  );

  const initialEdges = useMemo(
    () =>
      graph.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        animated: true,
      })) as Edge[],
    [graph.edges],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(
      graph.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
        selected: n.id === selectedNodeId,
      })) as Node[],
    );
    setEdges(
      graph.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        animated: true,
      })) as Edge[],
    );
  }, [graph, selectedNodeId, setNodes, setEdges]);

  const emitChange = useCallback(
    (nextNodes: Node[], nextEdges: Edge[]) => {
      onChange({
        nodes: nextNodes.map((n) => ({
          id: n.id,
          type: n.type as "trigger" | "condition" | "action",
          position: n.position,
          data: n.data as Record<string, unknown>,
        })),
        edges: nextEdges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle ?? undefined,
        })),
      });
    },
    [onChange],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => {
        const next = addEdge({ ...connection, animated: true }, eds);
        emitChange(nodes, next);
        return next;
      });
    },
    [nodes, setEdges, emitChange],
  );

  const onNodeDragStop = useCallback(
    (_: unknown, node: Node) => {
      setNodes((nds) => {
        const next = nds.map((n) => (n.id === node.id ? { ...n, position: node.position } : n));
        emitChange(next, edges);
        return next;
      });
    },
    [edges, setNodes, emitChange],
  );

  return (
    <div className="h-full w-full rounded-lg border border-border bg-background/50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={(_, node) => onSelectNode(node.id)}
        onPaneClick={() => onSelectNode(null)}
        nodeTypes={workflowNodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} size={1} />
        <Controls />
        <MiniMap zoomable pannable />
      </ReactFlow>
    </div>
  );
}
