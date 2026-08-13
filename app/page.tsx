import { supabaseServer } from '@/lib/supabase/server';
import GenealogyTree from '@/components/genealogy/genealogy-tree';
import type { Clan } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = supabaseServer();
  const { data, error } = await supabase.from('clans').select('*').order('name');

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-600">
        <div className="text-center">
          <p className="text-sm font-medium">Không thể tải danh sách dòng họ.</p>
          <p className="mt-1 text-xs text-slate-400">{error.message}</p>
        </div>
      </div>
    );
  }

  const clans = (data ?? []) as Clan[];

  if (clans.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-600">
        <p className="text-sm">Chưa có dòng họ nào trong cơ sở dữ liệu.</p>
      </div>
    );
  }

  return <GenealogyTree clans={clans} />;
}
