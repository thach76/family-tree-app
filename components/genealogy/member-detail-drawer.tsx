'use client';

import { useEffect, useState } from 'react';
import {
  User,
  Users,
  Plus,
  Edit,
  X,
  Heart,
  ChevronRight,
  Calendar,
  Check,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Clan, Member, Gender, SpouseStatus } from '@/lib/types';

export interface AddParentInput {
  name: string;
  gender: Gender;
  birthDateLunar: string;
  deathDateLunar: string;
  isAlive: boolean;
  bio: string;
}

export interface AddRelationInput {
  name: string;
  gender: Gender;
  birthDateLunar: string;
  deathDateLunar: string;
  isAlive: boolean;
  bio: string;
  spouseStatus?: SpouseStatus;
}

export interface EditMemberInput {
  name: string;
  gender: Gender;
  birthDateLunar: string;
  deathDateLunar: string;
  isAlive: boolean;
  bio: string;
}

interface MemberDetailPanelProps {
  member: Member | null;
  clan: Clan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddMaternalParent: (memberId: string, parentData: AddParentInput) => Promise<void>;
  onAddSpouse: (memberId: string, spouseData: AddRelationInput) => Promise<void>;
  onAddChild: (memberId: string, childData: AddRelationInput) => Promise<void>;
  onEditMember: (memberId: string, editData: EditMemberInput) => Promise<void>;
  onExpandMaternal: (memberId: string) => void;
}

type FormType = 'edit' | 'spouse' | 'child' | 'maternal' | null;

const emptyForm: AddRelationInput = {
  name: '',
  gender: 'male',
  birthDateLunar: '',
  deathDateLunar: '',
  isAlive: true,
  bio: '',
  spouseStatus: 'current',
};

export function MemberDetailPanel({
  member,
  clan,
  open,
  onOpenChange,
  onAddMaternalParent,
  onAddSpouse,
  onAddChild,
  onEditMember,
  onExpandMaternal,
}: MemberDetailPanelProps) {
  const [activeForm, setActiveForm] = useState<FormType>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<AddRelationInput>(emptyForm);

  const isFemale = member?.gender === 'female';
  const hasMaternalLink = Boolean(member?.mother_id);

  useEffect(() => {
    if (!open) {
      setActiveForm(null);
      setFormError(null);
      setForm(emptyForm);
    }
  }, [open]);

  useEffect(() => {
    setActiveForm(null);
    setFormError(null);
    setForm(emptyForm);
  }, [member?.id]);

  if (!open) return null;

  const safeName = member?.name ?? '';
  const branchSectionTitle = isFemale
    ? 'Họ Ngoại (Nhà đẻ)'
    : !member?.father_id
      ? 'Họ Rể'
      : 'Họ Ngoại';

  const resetForm = () => {
    setForm(emptyForm);
    setActiveForm(null);
    setFormError(null);
  };

  const handleSubmit = async () => {
    if (!member || !(form.name || '').trim()) return;
    setSaving(true);
    setFormError(null);
    try {
      const trimmedName = (form.name || '').trim();
      const payload = { ...form, name: trimmedName };
      if (activeForm === 'edit') {
        await onEditMember(member.id, payload);
      } else if (activeForm === 'spouse') {
        await onAddSpouse(member.id, payload);
      } else if (activeForm === 'child') {
        await onAddChild(member.id, payload);
      } else if (activeForm === 'maternal') {
        await onAddMaternalParent(member.id, payload);
      }
      resetForm();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Lỗi khi lưu.');
    } finally {
      setSaving(false);
    }
  };

  const toggleForm = (type: FormType) => {
    if (activeForm === type) {
      setActiveForm(null);
    } else {
      setActiveForm(type);
      if (type === 'edit' && member) {
        setForm({
          name: member.name,
          gender: member.gender,
          birthDateLunar: member.birth_date_lunar ?? '',
          deathDateLunar: member.death_date_lunar ?? '',
          isAlive: member.is_alive,
          bio: member.bio ?? '',
          spouseStatus: member.spouse_status ?? 'current',
        });
      } else {
        setForm(emptyForm);
      }
      setFormError(null);
    }
  };

  const formTitle =
    activeForm === 'edit'
      ? 'Chỉnh sửa thông tin'
      : activeForm === 'spouse'
        ? 'Thêm Vợ / Chồng'
        : activeForm === 'child'
          ? 'Thêm Con'
          : 'Thêm Cha/Mẹ họ Ngoại';

  const formSubmitLabel =
    activeForm === 'edit' ? 'Lưu thay đổi' : 'Lưu thông tin';

  return (
    <div className="fixed right-0 top-0 h-full w-96 max-w-[90vw] bg-white shadow-2xl z-50 p-6 overflow-y-auto border-l border-slate-200 dark:bg-slate-950 dark:border-slate-800">
      <div className="sticky top-0 -mx-6 -mt-6 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-emerald-600" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Chi tiết thành viên
          </h2>
        </div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {member ? (
        <div className="space-y-5 mt-4">
          {/* Header card */}
          <div className="flex items-start gap-4">
            <div
              className={cn(
                'flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full text-xl font-semibold',
                isFemale
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-200'
                  : 'bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-200'
              )}
            >
              {isFemale ? <Users className="h-8 w-8" /> : <User className="h-8 w-8" />}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-lg font-semibold text-slate-900 dark:text-slate-100">
                {safeName}
              </h3>
              <div className="mt-1.5 flex flex-wrap gap-2">
                <Badge
                  variant="secondary"
                  className={isFemale ? 'bg-rose-100 text-rose-700' : 'bg-sky-100 text-sky-700'}
                >
                  {isFemale ? 'Nữ' : 'Nam'}
                </Badge>
                <Badge variant="outline">Thế hệ {member.generation}</Badge>
                <Badge
                  variant={member.is_alive ? 'default' : 'secondary'}
                  className={member.is_alive ? 'bg-emerald-600 hover:bg-emerald-600' : ''}
                >
                  {member.is_alive ? 'Còn sống' : 'Đã mất'}
                </Badge>
              </div>
            </div>
          </div>

          {clan && (
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900/50">
              <Users className="h-4 w-4 text-slate-500" />
              <span className="text-slate-600 dark:text-slate-400">Dòng họ:</span>
              <span className="font-medium text-slate-900 dark:text-slate-200">{clan.name}</span>
              <Badge variant="outline" className="ml-auto">
                {clan.kind === 'noi' ? 'Họ Nội' : 'Họ Ngoại'}
              </Badge>
            </div>
          )}

          {/* Dates */}
          <div className="space-y-2">
            <DetailRow icon={<Calendar className="h-4 w-4 text-sky-500" />} label="Ngày sinh (âm lịch)">
              {member.birth_date_lunar ?? '—'}
            </DetailRow>
            <DetailRow icon={<Calendar className="h-4 w-4 text-slate-400" />} label="Ngày mất (âm lịch)">
              {member.death_date_lunar ?? '—'}
            </DetailRow>
          </div>

          {member.bio && (
            <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <Users className="h-4 w-4" />
                Tiểu sử
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {member.bio}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
            <ActionButton
              icon={<Edit className="h-4 w-4" />}
              label="Chỉnh sửa thông tin cá nhân"
              active={activeForm === 'edit'}
              onClick={() => toggleForm('edit')}
            />
            <ActionButton
              icon={<Heart className="h-4 w-4" />}
              label="Thêm Vợ / Chồng"
              active={activeForm === 'spouse'}
              onClick={() => toggleForm('spouse')}
            />
            <ActionButton
              icon={<Plus className="h-4 w-4" />}
              label="Thêm Con"
              active={activeForm === 'child'}
              onClick={() => toggleForm('child')}
            />
          </div>

          {/* Branch expansion section */}
          <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-800 dark:bg-rose-950/20">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-rose-700 dark:text-rose-300">
              <ChevronRight className="h-4 w-4" />
              {branchSectionTitle}
            </div>

            <div className="mb-3 text-xs text-rose-600/80 dark:text-rose-400/80">
              {hasMaternalLink
                ? 'Đã liên kết với cha/mẹ bên họ Ngoại.'
                : 'Chưa có liên kết họ Ngoại. Thêm Cha/Mẹ để mở rộng nhánh.'}
            </div>

            <div className="space-y-2">
              <ActionButton
                icon={<Plus className="h-4 w-4" />}
                label="Thêm Cha/Mẹ bên Ngoại"
                active={activeForm === 'maternal'}
                onClick={() => toggleForm('maternal')}
              />
              <Button
                variant="outline"
                className="w-full justify-start border-rose-200 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
                onClick={() => onExpandMaternal(member.id)}
                disabled={!hasMaternalLink}
              >
                <ChevronRight className="mr-2 h-4 w-4" />
                Mở rộng nhánh Họ Ngoại
              </Button>
            </div>
          </div>

          {/* Active form */}
          {activeForm && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <h4 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {formTitle}
              </h4>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Họ tên</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Nhập họ tên..."
                    className="mt-1"
                  />
                </div>

                {activeForm !== 'spouse' && (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label className="text-xs">Giới tính</Label>
                      <select
                        value={form.gender}
                        onChange={(e) =>
                          setForm({ ...form, gender: e.target.value as Gender })
                        }
                        className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      >
                        <option value="male">Nam</option>
                        <option value="female">Nữ</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs">Trạng thái</Label>
                      <select
                        value={form.isAlive ? 'alive' : 'deceased'}
                        onChange={(e) =>
                          setForm({ ...form, isAlive: e.target.value === 'alive' })
                        }
                        className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      >
                        <option value="alive">Còn sống</option>
                        <option value="deceased">Đã mất</option>
                      </select>
                    </div>
                  </div>
                )}

                {activeForm === 'spouse' && (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label className="text-xs">Trạng thái</Label>
                      <select
                        value={form.isAlive ? 'alive' : 'deceased'}
                        onChange={(e) =>
                          setForm({ ...form, isAlive: e.target.value === 'alive' })
                        }
                        className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      >
                        <option value="alive">Còn sống</option>
                        <option value="deceased">Đã mất</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs">Tình trạng hôn nhân</Label>
                      <select
                        value={form.spouseStatus ?? 'current'}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            spouseStatus: e.target.value as SpouseStatus,
                          })
                        }
                        className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      >
                        <option value="current">Vợ/Chồng hiện tại</option>
                        <option value="ex">Vợ/Chồng cũ (ly hôn)</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Ngày sinh (âm lịch)</Label>
                    <Input
                      value={form.birthDateLunar}
                      onChange={(e) =>
                        setForm({ ...form, birthDateLunar: e.target.value })
                      }
                      placeholder="VD: 01/01/Tân Hợi"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">Ngày mất (âm lịch)</Label>
                    <Input
                      value={form.deathDateLunar}
                      onChange={(e) =>
                        setForm({ ...form, deathDateLunar: e.target.value })
                      }
                      placeholder="Bỏ trống nếu còn sống"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Tiểu sử / Ghi chú</Label>
                  <Input
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    placeholder="Ghi chú thêm..."
                    className="mt-1"
                  />
                </div>

                {formError && (
                  <p className="text-xs text-red-600 dark:text-red-400">{formError}</p>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={saving || !(form.name || '').trim()}
                    className="flex-1"
                  >
                    {saving ? (
                      <>
                        <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        {formSubmitLabel}
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={resetForm} disabled={saving}>
                    Hủy
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex h-full items-center justify-center p-6 text-sm text-slate-400">
          Chưa chọn thành viên nào.
        </div>
      )}
    </div>
  );
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{children}</p>
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
        active
          ? 'border-emerald-300 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
          : 'border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
      )}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      <ChevronRight
        className={cn('h-4 w-4 transition-transform', active && 'rotate-90')}
      />
    </button>
  );
}
