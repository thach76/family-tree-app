'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { supabase } from '@/lib/supabase/client';
import type { Clan, Member, Gender } from '@/lib/types';
import { layoutParallel, type Decorators } from '@/lib/tree-layout';
import { MemberNode, type MemberNodeData } from '@/components/genealogy/member-node';
import { Sidebar } from '@/components/genealogy/sidebar';
import {
  MemberDetailPanel,
  type AddParentInput,
  type AddRelationInput,
  type EditMemberInput,
} from '@/components/genealogy/member-detail-drawer';

const nodeTypes = { member: MemberNode };

interface GenealogyTreeProps {
  clans: Clan[];
}

export function GenealogyTree({ clans }: GenealogyTreeProps) {
  const noiClan = useMemo(
    () => clans.find((c) => c.kind === 'noi') ?? clans[0] ?? null,
    [clans]
  );
  const ngoaiClans = useMemo(() => clans.filter((c) => c.kind === 'ngoai'), [clans]);

  const [noiMembers, setNoiMembers] = useState<Member[]>([]);
  const [ngoaiMembers, setNgoaiMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const [activeMaternalId, setActiveMaternalId] = useState<string | null>(null);
  const [maternalLoading, setMaternalLoading] = useState(false);

  const memberByIdRef = useRef<Map<string, Member>>(new Map());

  const loadNoiMembers = useCallback(async () => {
    if (!noiClan) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('members')
        .select('*')
        .eq('clan_id', noiClan.id)
        .order('generation', { ascending: true });
      if (err) throw err;
      const safe = Array.isArray(data) ? (data as Member[]) : [];
      setNoiMembers(safe);
      for (const m of safe) memberByIdRef.current.set(m.id, m);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải cây họ Nội.');
    } finally {
      setLoading(false);
    }
  }, [noiClan]);

  useEffect(() => {
    loadNoiMembers();
  }, [loadNoiMembers]);

  useEffect(() => {
    setActiveMaternalId(null);
    setNgoaiMembers([]);
  }, [noiMembers]);

  const handleShowMaternal = useCallback(
    async (memberId: string) => {
      if (activeMaternalId === memberId) {
        setActiveMaternalId(null);
        setNgoaiMembers([]);
        return;
      }

      const member = memberByIdRef.current.get(memberId);
      if (!member) return;

      if (!member.mother_id) {
        setActiveMaternalId(memberId);
        setNgoaiMembers([]);
        return;
      }

      setActiveMaternalId(memberId);
      setMaternalLoading(true);
      try {
        const { data, error: err } = await supabase.rpc('get_maternal_tree', {
          mother_id: member.mother_id,
        });
        if (err) throw err;
        const safe = Array.isArray(data) ? (data as Member[]) : [];
        setNgoaiMembers(safe);
        for (const m of safe) memberByIdRef.current.set(m.id, m);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Không thể tải nhánh họ Ngoại.');
        setNgoaiMembers([]);
      } finally {
        setMaternalLoading(false);
      }
    },
    [activeMaternalId]
  );

  const handleSelectMember = useCallback((memberId: string) => {
    const m = memberByIdRef.current.get(memberId);
    if (m) {
      setSelectedMember(m);
      setPanelOpen(true);
    }
  }, []);

  // Single merged effect: compute layout AND decorate nodes with handlers.
  // This eliminates the race condition where onSelect was missing on first render.
  useEffect(() => {
    const connection =
      activeMaternalId && ngoaiMembers.length > 0
        ? (() => {
            const member = memberByIdRef.current.get(activeMaternalId);
            if (!member?.mother_id) return null;
            return { fromId: member.mother_id, toId: activeMaternalId };
          })()
        : null;

    const noiDec: Record<string, Partial<Decorators>> = {};
    for (const m of noiMembers) {
      const isFemale = m.gender === 'female';
      // Females (wives/daughters/daughters-in-law) can expand to their birth clan (Họ Ngoại)
      // Males who married into this clan (sons-in-law / rể) can expand to their birth clan (Họ Rể)
      const canExpand = isFemale || m.spouse_id != null;
      let branchLabel = 'Xem nhánh Họ Ngoại';
      if (!isFemale && m.spouse_id) {
        branchLabel = 'Xem họ Rể';
      } else if (isFemale && m.father_id) {
        branchLabel = m.mother_id ? 'Xem nhánh Họ Ngoại' : 'Xem nhà Chồng';
      }
      noiDec[m.id] = {
        variant: 'noi',
        isFemale,
        canExpandBranch: canExpand,
        branchLabel,
        maternalActive: activeMaternalId === m.id,
        maternalLoading: maternalLoading && activeMaternalId === m.id,
        onShowMaternal: handleShowMaternal,
        onSelect: handleSelectMember,
      };
    }

    const ngoaiDec: Record<string, Partial<Decorators>> = {};
    for (const m of ngoaiMembers) {
      const isFemale = m.gender === 'female';
      ngoaiDec[m.id] = {
        variant: 'ngoai',
        isFemale,
        canExpandBranch: false,
        branchLabel: 'Xem nhánh Họ Ngoại',
        maternalActive: false,
        maternalLoading: false,
        onShowMaternal: handleShowMaternal,
        onSelect: handleSelectMember,
      };
    }

    const result = layoutParallel(noiMembers, ngoaiMembers, connection, {
      noi: noiDec,
      ngoai: ngoaiDec,
    });
    setNodes(result.nodes);
    setEdges(result.edges);
  }, [
    noiMembers,
    ngoaiMembers,
    activeMaternalId,
    maternalLoading,
    handleShowMaternal,
    handleSelectMember,
    setNodes,
    setEdges,
  ]);

  // --- Mutation handlers ---

  const handleAddMaternalParent = useCallback(
    async (memberId: string, parentData: AddParentInput) => {
      const member = memberByIdRef.current.get(memberId);
      if (!member) return;

      const targetClan = ngoaiClans[0];
      if (!targetClan) {
        setError('Chưa có dòng họ Ngoại nào trong hệ thống.');
        throw new Error('No ngoai clan');
      }

      const insertData = {
        clan_id: targetClan.id,
        name: parentData.name,
        gender: parentData.gender,
        generation: member.generation,
        birth_date_lunar: parentData.birthDateLunar || null,
        death_date_lunar: parentData.deathDateLunar || null,
        is_alive: parentData.isAlive,
        bio: parentData.bio || null,
      };

      const { data: newParent, error: insertErr } = await supabase
        .from('members')
        .insert(insertData)
        .select()
        .single();
      if (insertErr) throw insertErr;
      if (!newParent) throw new Error('Không thể tạo Cha/Mẹ họ Ngoại.');

      memberByIdRef.current.set(newParent.id, newParent);

      const updateField = parentData.gender === 'female' ? 'mother_id' : 'father_id';
      const { error: updateErr } = await supabase
        .from('members')
        .update({ [updateField]: newParent.id })
        .eq('id', memberId);
      if (updateErr) throw updateErr;

      const updatedMember = { ...member, [updateField]: newParent.id };
      memberByIdRef.current.set(memberId, updatedMember);
      setNoiMembers((prev) =>
        prev.map((m) => (m.id === memberId ? updatedMember : m))
      );
      setSelectedMember(updatedMember);

      setActiveMaternalId(memberId);
      setNgoaiMembers([newParent]);
    },
    [ngoaiClans]
  );

  const handleAddSpouse = useCallback(
    async (memberId: string, spouseData: AddRelationInput) => {
      const member = memberByIdRef.current.get(memberId);
      if (!member) return;

      const insertData = {
        clan_id: member.clan_id,
        name: spouseData.name,
        gender: (member.gender === 'male' ? 'female' : 'male') as Gender,
        generation: member.generation,
        birth_date_lunar: spouseData.birthDateLunar || null,
        death_date_lunar: spouseData.deathDateLunar || null,
        is_alive: spouseData.isAlive,
        bio: spouseData.bio || null,
        spouse_status: spouseData.spouseStatus ?? 'current',
      };

      const { data: newSpouse, error: insertErr } = await supabase
        .from('members')
        .insert(insertData)
        .select()
        .single();
      if (insertErr) throw insertErr;
      if (!newSpouse) throw new Error('Không thể tạo vợ/chồng.');

      memberByIdRef.current.set(newSpouse.id, newSpouse);

      // Bidirectional spouse link, propagate spouse_status to both sides
      const spouseStatus = spouseData.spouseStatus ?? 'current';
      const { error: updateErr } = await supabase
        .from('members')
        .update({ spouse_id: newSpouse.id, spouse_status: spouseStatus })
        .eq('id', memberId);
      if (updateErr) throw updateErr;

      const { error: updateErr2 } = await supabase
        .from('members')
        .update({ spouse_id: memberId, spouse_status: spouseStatus })
        .eq('id', newSpouse.id);
      if (updateErr2) throw updateErr2;

      const updatedMember = { ...member, spouse_id: newSpouse.id };
      memberByIdRef.current.set(memberId, updatedMember);
      setNoiMembers((prev) =>
        prev.map((m) => (m.id === memberId ? updatedMember : m))
      );
      setSelectedMember(updatedMember);

      // Reload to show the new spouse node in the tree
      await loadNoiMembers();
    },
    [loadNoiMembers]
  );

  const handleAddChild = useCallback(
    async (memberId: string, childData: AddRelationInput) => {
      const member = memberByIdRef.current.get(memberId);
      if (!member) return;

      const fatherId = member.gender === 'male' ? memberId : member.spouse_id;
      const motherId = member.gender === 'female' ? memberId : member.spouse_id;

      const insertData = {
        clan_id: member.clan_id,
        name: childData.name,
        gender: childData.gender,
        generation: member.generation + 1,
        father_id: fatherId || null,
        mother_id: motherId || null,
        birth_date_lunar: childData.birthDateLunar || null,
        death_date_lunar: childData.deathDateLunar || null,
        is_alive: childData.isAlive,
        bio: childData.bio || null,
      };

      const { data: newChild, error: insertErr } = await supabase
        .from('members')
        .insert(insertData)
        .select()
        .single();
      if (insertErr) throw insertErr;
      if (!newChild) throw new Error('Không thể tạo con.');

      memberByIdRef.current.set(newChild.id, newChild);
      await loadNoiMembers();
    },
    [loadNoiMembers]
  );

  const handleEditMember = useCallback(
    async (memberId: string, editData: EditMemberInput) => {
      const member = memberByIdRef.current.get(memberId);
      if (!member) return;

      const updateData = {
        name: editData.name,
        gender: editData.gender,
        birth_date_lunar: editData.birthDateLunar || null,
        death_date_lunar: editData.deathDateLunar || null,
        is_alive: editData.isAlive,
        bio: editData.bio || null,
      };

      const { data: updated, error: updateErr } = await supabase
        .from('members')
        .update(updateData)
        .eq('id', memberId)
        .select()
        .single();
      if (updateErr) throw updateErr;
      if (!updated) throw new Error('Không thể cập nhật.');

      memberByIdRef.current.set(memberId, updated);
      setNoiMembers((prev) => prev.map((m) => (m.id === memberId ? updated : m)));
      setNgoaiMembers((prev) => prev.map((m) => (m.id === memberId ? updated : m)));
      setSelectedMember(updated);
    },
    []
  );

  const handleExpandMaternal = useCallback(
    (memberId: string) => {
      setPanelOpen(false);
      handleShowMaternal(memberId);
    },
    [handleShowMaternal]
  );

  const selectedMemberClan = useMemo(
    () => clans.find((c) => c.id === selectedMember?.clan_id) ?? null,
    [clans, selectedMember]
  );

  return (
    <div className="flex w-full h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar
        clans={clans}
        noiClanName={noiClan?.name ?? null}
        activeMaternalId={activeMaternalId}
        loading={loading}
        memberCount={noiMembers.length + ngoaiMembers.length}
      />

      <main className="relative flex-1 h-screen">
        <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/80 px-6 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {noiClan ? `${noiClan.name} — Cây Họ Nội` : 'Cây Gia Phả'}
              {activeMaternalId && ngoaiMembers.length > 0 && (
                <span className="ml-2 text-rose-600 dark:text-rose-400">
                  + Nhánh Họ Ngoại
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {noiMembers.length} thành viên Nội
              {ngoaiMembers.length > 0 && ` · ${ngoaiMembers.length} thành viên Ngoại`}
              {' · '}{nodes.length} node · {edges.length} liên kết
            </p>
          </div>
          {error && (
            <div className="max-w-md truncate rounded-md bg-red-50 px-3 py-1.5 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </div>
          )}
        </div>

        <div className="w-full h-screen pt-[57px]">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-slate-400">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
                <p className="text-sm">Đang tải cây gia phả...</p>
              </div>
            </div>
          ) : noiMembers.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center text-slate-400">
                <p className="text-sm">Dòng họ Nội chưa có thành viên nào.</p>
              </div>
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.15 }}
              minZoom={0.15}
              maxZoom={2.5}
              defaultEdgeOptions={{ type: 'smoothstep' }}
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#cbd5e1" gap={20} />
              <Controls className="!rounded-lg !border-slate-200 !shadow-sm" />
              <MiniMap
                pannable
                zoomable
                className="!rounded-lg !border !border-slate-200"
                nodeColor={(n) => {
                  const data = n.data as MemberNodeData;
                  return data?.isFemale ? '#fda4af' : '#7dd3fc';
                }}
              />
            </ReactFlow>
          )}
        </div>
      </main>

      <MemberDetailPanel
        member={selectedMember}
        clan={selectedMemberClan}
        open={panelOpen}
        onOpenChange={setPanelOpen}
        onAddMaternalParent={handleAddMaternalParent}
        onAddSpouse={handleAddSpouse}
        onAddChild={handleAddChild}
        onEditMember={handleEditMember}
        onExpandMaternal={handleExpandMaternal}
      />
    </div>
  );
}

export default function GenealogyTreeWithProvider({ clans }: GenealogyTreeProps) {
  return (
    <ReactFlowProvider>
      <GenealogyTree clans={clans} />
    </ReactFlowProvider>
  );
}
