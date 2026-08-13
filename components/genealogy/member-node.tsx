'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { User, Users, Plus, Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Member } from '@/lib/types';

export interface MemberNodeData extends Record<string, unknown> {
  member: Member;
  isFemale: boolean;
  canExpandBranch: boolean;
  branchLabel: string;
  maternalActive: boolean;
  maternalLoading: boolean;
  onShowMaternal?: (memberId: string) => void;
  onSelect?: (memberId: string) => void;
  variant: 'noi' | 'ngoai' | 'overview';
}

type MemberNodeProps = NodeProps & { data: MemberNodeData };

function MemberNodeComponent({ data }: MemberNodeProps) {
  const {
    member,
    isFemale,
    canExpandBranch,
    branchLabel,
    maternalActive,
    maternalLoading,
    onShowMaternal,
    onSelect,
    variant = 'noi',
  } = data;

  if (!member) return null;

  const deceased = !member.is_alive;
  const safeName = member.name ?? '';

  const accent =
    variant === 'ngoai'
      ? 'from-rose-500/15 to-rose-50 dark:to-rose-950/30 border-rose-300/60'
      : variant === 'overview'
        ? 'from-slate-500/15 to-slate-50 dark:to-slate-900/30 border-slate-300/60'
        : 'from-emerald-500/15 to-emerald-50 dark:to-emerald-950/30 border-emerald-300/60';

  const avatarBg = isFemale
    ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-200'
    : 'bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-200';

  // Use optional chaining to avoid TypeError if callbacks are missing
  const handleSelect = () => {
    data.onSelect?.(member.id);
  };

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    data.onShowMaternal?.(member.id);
  };

  return (
    <div
      className={cn(
        'group relative w-[220px] rounded-xl border bg-gradient-to-br shadow-sm transition-all hover:shadow-md',
        accent,
        maternalActive && 'ring-2 ring-rose-400 ring-offset-1'
      )}
    >
      <Handle id="top" type="target" position={Position.Top} className="!h-2 !w-2 !bg-slate-400" />
      <Handle id="left" type="target" position={Position.Left} className="!h-1.5 !w-1.5 !bg-rose-400 !opacity-30" />

      <button
        type="button"
        onClick={handleSelect}
        className="flex w-full items-start gap-3 p-3 text-left"
      >
        <div
          className={cn(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold',
            avatarBg
          )}
        >
          {isFemale ? <Users className="h-5 w-5" /> : <User className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              {safeName}
            </p>
            {deceased && (
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-slate-400" title="Đã mất" />
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {isFemale ? 'Nữ' : 'Nam'} · Thế hệ {member.generation}
          </p>
          <span
            className={cn(
              'mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium',
              deceased
                ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
            )}
          >
            {deceased ? 'Đã mất' : 'Còn sống'}
          </span>
        </div>
      </button>

      {canExpandBranch && (
        <button
          type="button"
          disabled={maternalLoading}
          onClick={handleExpand}
          className={cn(
            'mx-3 mb-3 flex w-[calc(100%-1.5rem)] items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-colors disabled:cursor-default',
            maternalActive
              ? 'border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
              : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/60'
          )}
        >
          {maternalLoading ? (
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-rose-300 border-t-rose-600" />
          ) : maternalActive ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          {maternalLoading
            ? 'Đang tải...'
            : maternalActive
              ? 'Đang hiển thị nhánh'
              : branchLabel}
          {!maternalActive && !maternalLoading && (
            <ChevronRight className="h-3 w-3" />
          )}
        </button>
      )}

      <Handle id="bottom" type="source" position={Position.Bottom} className="!h-2 !w-2 !bg-slate-400" />
      <Handle id="right" type="source" position={Position.Right} className="!h-1.5 !w-1.5 !bg-rose-400 !opacity-30" />
    </div>
  );
}

export const MemberNode = memo(MemberNodeComponent);
