'use client';

import { Users, Plus, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Clan } from '@/lib/types';

interface SidebarProps {
  clans: Clan[];
  noiClanName: string | null;
  activeMaternalId: string | null;
  loading: boolean;
  memberCount: number;
}

export function Sidebar({
  clans,
  noiClanName,
  activeMaternalId,
  loading,
  memberCount,
}: SidebarProps) {
  const noiClans = Array.isArray(clans) ? clans.filter((c) => c.kind === 'noi') : [];
  const ngoaiClans = Array.isArray(clans) ? clans.filter((c) => c.kind === 'ngoai') : [];

  return (
    <aside className="flex h-screen w-72 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-5 dark:border-slate-800">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Cây Gia Phả
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Song song 2 cây Nội / Ngoại
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-5">
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Dòng họ Nội (trục chính)
          </label>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/30">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                {noiClanName ?? 'Chưa có'}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-emerald-600/70 dark:text-emerald-400/70">
              Luôn hiển thị toàn bộ thế hệ ở giữa màn hình
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Dòng họ Ngoại (khai mở)
          </label>
          <div className="space-y-1">
            {ngoaiClans.length === 0 ? (
              <p className="text-xs text-slate-400">Chưa có dòng họ Ngoại.</p>
            ) : (
              ngoaiClans.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50/50 p-2.5 dark:border-rose-800 dark:bg-rose-950/20"
                >
                  <Plus className="h-3.5 w-3.5 text-rose-500" />
                  <span className="text-xs font-medium text-rose-700 dark:text-rose-300">
                    {c.name}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
            <Users className="h-4 w-4" />
            Thống kê
          </div>
          <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex justify-between">
              <span>Tổng dòng họ:</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">{clans.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Thành viên đang hiển thị:</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">{memberCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Nhánh Ngoại đang mở:</span>
              <span
                className={cn(
                  'font-medium',
                  activeMaternalId ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'
                )}
              >
                {activeMaternalId ? 'Có' : 'Không'}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
          <p className="mb-1 font-medium text-slate-700 dark:text-slate-300">Hướng dẫn</p>
          <ul className="list-inside list-disc space-y-1">
            <li>Nhấn vào thành viên để xem chi tiết.</li>
            <li>
              Trên node Nữ / Dâu / Rể, bấm{' '}
              <span className="font-medium text-rose-600">Xem họ Ngoại / Nhà Chồng</span> để
              tải cây liên kết bên cạnh.
            </li>
            <li>Bấm node khác sẽ đóng nhánh cũ, mở nhánh mới.</li>
            <li>Vợ hiện tại: nét liền hồng. Vợ cũ: nét đứt xám.</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-200 px-5 py-3 text-[10px] text-slate-400 dark:border-slate-800 dark:text-slate-500">
        Powered by Supabase · React Flow · Dagre
      </div>
    </aside>
  );
}
