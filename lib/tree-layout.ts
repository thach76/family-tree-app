import dagre from 'dagre';
import type { Edge, Node } from '@xyflow/react';
import type { Member } from '@/lib/types';

export const NODE_WIDTH = 220;
export const NODE_HEIGHT = 130;
const RANK_SPACING = 110;
const NODE_SPACING = 50;
const SPOUSE_GAP = 60;
const TREE_GAP = 160;

export interface LayoutResult {
  nodes: Node[];
  edges: Edge[];
}

export interface Decorators {
  variant: 'noi' | 'ngoai' | 'overview';
  isFemale: boolean;
  canExpandBranch: boolean;
  branchLabel: string;
  maternalActive: boolean;
  maternalLoading: boolean;
  onShowMaternal?: (memberId: string) => void;
  onSelect?: (memberId: string) => void;
}

export function layoutTree(
  members: Member[],
  decorators: Partial<Record<string, Partial<Decorators>>> = {}
): LayoutResult {
  if (!Array.isArray(members) || members.length === 0) {
    return { nodes: [], edges: [] };
  }

  const ids = new Set(members.map((m) => m.id));

  const connected = new Set<string>();
  for (const m of members) {
    if (m.father_id && ids.has(m.father_id)) {
      connected.add(m.id);
      connected.add(m.father_id);
    }
    if (m.mother_id && ids.has(m.mother_id)) {
      connected.add(m.id);
      connected.add(m.mother_id);
    }
  }

  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: 'TB',
    ranksep: RANK_SPACING,
    nodesep: NODE_SPACING,
    marginx: 20,
    marginy: 20,
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const m of members) {
    g.setNode(m.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  for (const m of members) {
    if (m.father_id && ids.has(m.father_id)) {
      g.setEdge(m.father_id, m.id);
    }
    if (m.mother_id && ids.has(m.mother_id) && m.mother_id !== m.father_id) {
      g.setEdge(m.mother_id, m.id);
    }
  }

  dagre.layout(g);

  const positions = new Map<string, { x: number; y: number }>();
  for (const m of members) {
    const pos = g.node(m.id);
    if (pos) {
      positions.set(m.id, {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      });
    } else {
      positions.set(m.id, { x: 0, y: 0 });
    }
  }

  // Align spouse pairs to the same Y (same generation / rank)
  const processed = new Set<string>();
  for (const m of members) {
    if (m.spouse_id && ids.has(m.spouse_id) && !processed.has(m.id)) {
      const partnerId = m.spouse_id;
      processed.add(m.id);
      processed.add(partnerId);

      const p1 = positions.get(m.id)!;
      const p2 = positions.get(partnerId)!;
      const selfConnected = connected.has(m.id);
      const partnerConnected = connected.has(partnerId);

      if (selfConnected && !partnerConnected) {
        positions.set(partnerId, {
          x: p1.x + NODE_WIDTH + SPOUSE_GAP,
          y: p1.y,
        });
      } else if (!selfConnected && partnerConnected) {
        positions.set(m.id, {
          x: p2.x + NODE_WIDTH + SPOUSE_GAP,
          y: p2.y,
        });
      } else {
        const sameY = Math.max(p1.y, p2.y);
        positions.set(m.id, { ...p1, y: sameY });
        positions.set(partnerId, { ...p2, y: sameY });
      }
    }
  }

  const nodes: Node[] = members.map((m) => {
    const pos = positions.get(m.id) ?? { x: 0, y: 0 };
    const dec = decorators[m.id] ?? {};
    return {
      id: m.id,
      type: 'member',
      position: pos,
      data: {
        member: m,
        variant: dec.variant ?? 'noi',
        isFemale: dec.isFemale ?? m.gender === 'female',
        canExpandBranch: dec.canExpandBranch ?? false,
        branchLabel: dec.branchLabel ?? 'Xem nhánh Họ Ngoại',
        maternalActive: dec.maternalActive ?? false,
        maternalLoading: dec.maternalLoading ?? false,
        onShowMaternal: dec.onShowMaternal,
        onSelect: dec.onSelect,
      },
    };
  });

  const edges: Edge[] = [];
  const edgeSet = new Set<string>();

  // Parent-child edges: both father and mother connect to children
  for (const m of members) {
    if (m.father_id && ids.has(m.father_id)) {
      const eid = `pc-f-${m.father_id}-${m.id}`;
      if (!edgeSet.has(eid)) {
        edgeSet.add(eid);
        edges.push({
          id: eid,
          source: m.father_id,
          target: m.id,
          sourceHandle: 'bottom',
          targetHandle: 'top',
          type: 'smoothstep',
          style: { stroke: '#64748b', strokeWidth: 2 },
        });
      }
    }
    if (m.mother_id && ids.has(m.mother_id)) {
      const eid = `pc-m-${m.mother_id}-${m.id}`;
      if (!edgeSet.has(eid)) {
        edgeSet.add(eid);
        edges.push({
          id: eid,
          source: m.mother_id,
          target: m.id,
          sourceHandle: 'bottom',
          targetHandle: 'top',
          type: 'smoothstep',
          style: { stroke: '#64748b', strokeWidth: 1.5 },
        });
      }
    }
  }

  // Spouse edges: current = solid pink, ex = dashed gray with "Vợ cũ" label
  processed.clear();
  for (const m of members) {
    if (m.spouse_id && ids.has(m.spouse_id) && !processed.has(m.id)) {
      const partnerId = m.spouse_id;
      processed.add(m.id);
      processed.add(partnerId);

      const sorted = [m.id, partnerId].sort();
      const eid = `sp-${sorted[0]}-${sorted[1]}`;
      if (!edgeSet.has(eid)) {
        edgeSet.add(eid);
        const p1 = positions.get(m.id)!;
        const p2 = positions.get(partnerId)!;
        const [leftId, rightId] = p1.x <= p2.x ? [m.id, partnerId] : [partnerId, m.id];

        const isEx = m.spouse_status === 'ex';
        edges.push({
          id: eid,
          source: leftId,
          target: rightId,
          sourceHandle: 'right',
          targetHandle: 'left',
          type: 'smoothstep',
          label: isEx ? 'Vợ cũ' : undefined,
          labelStyle: isEx
            ? { fill: '#94a3b8', fontSize: 11, fontWeight: 600 }
            : undefined,
          labelBgStyle: isEx
            ? { fill: '#f1f5f9', fillOpacity: 0.9 }
            : undefined,
          style: isEx
            ? { stroke: '#94a3b8', strokeWidth: 1.5, strokeDasharray: '5 4' }
            : { stroke: '#ec4899', strokeWidth: 2.5 },
        });
      }
    }
  }

  return { nodes, edges };
}

export function layoutParallel(
  noiMembers: Member[],
  ngoaiMembers: Member[],
  connection: { fromId: string; toId: string } | null,
  decorators: {
    noi: Partial<Record<string, Partial<Decorators>>>;
    ngoai: Partial<Record<string, Partial<Decorators>>>;
  } = { noi: {}, ngoai: {} }
): LayoutResult {
  const safeNoi = Array.isArray(noiMembers) ? noiMembers : [];
  const safeNgoai = Array.isArray(ngoaiMembers) ? ngoaiMembers : [];

  const noiLayout = layoutTree(safeNoi, decorators.noi);

  if (safeNgoai.length === 0) {
    return noiLayout;
  }

  const noiMaxX = noiLayout.nodes.reduce(
    (max, n) => Math.max(max, n.position.x + NODE_WIDTH),
    0
  );
  const offsetX = noiMaxX + TREE_GAP;

  const ngoaiLayout = layoutTree(safeNgoai, decorators.ngoai);

  const ngoaiNodes = ngoaiLayout.nodes.map((n) => ({
    ...n,
    position: { x: n.position.x + offsetX, y: n.position.y },
  }));

  const allNodes = [...noiLayout.nodes, ...ngoaiNodes];
  const allEdges = [...noiLayout.edges, ...ngoaiLayout.edges];

  if (connection) {
    allEdges.push({
      id: `maternal-${connection.fromId}-${connection.toId}`,
      source: connection.fromId,
      target: connection.toId,
      sourceHandle: 'bottom',
      targetHandle: 'top',
      type: 'smoothstep',
      style: { stroke: '#f43f5e', strokeWidth: 2.5, strokeDasharray: '6 4' },
      animated: true,
    });
  }

  return { nodes: allNodes, edges: allEdges };
}
