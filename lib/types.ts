export type ClanKind = 'noi' | 'ngoai';

export interface Clan {
  id: string;
  name: string;
  description: string | null;
  kind: ClanKind;
  created_at: string;
}

export type Gender = 'male' | 'female';

export type SpouseStatus = 'current' | 'ex';

export interface Member {
  id: string;
  clan_id: string;
  name: string;
  gender: Gender;
  generation: number;
  father_id: string | null;
  mother_id: string | null;
  spouse_id: string | null;
  spouse_name: string | null;
  spouse_status: SpouseStatus;
  birth_date_lunar: string | null;
  death_date_lunar: string | null;
  is_alive: boolean;
  bio: string | null;
  created_at: string;
}

export interface MaternalParentInput {
  name: string;
  gender: Gender;
  clanId: string;
  generation: number;
  birthDateLunar: string;
  deathDateLunar: string;
  isAlive: boolean;
  bio: string;
}
