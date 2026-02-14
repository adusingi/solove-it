import { supabase } from '@/lib/supabase';
import { BudgetRange, Wish, WishCategory, WishPriority, WishStatus } from '@/types/wish';

type JsonRow = Record<string, unknown>;

const FALLBACK_CATEGORY: WishCategory = 'experience';
const FALLBACK_PRIORITY: WishPriority = 'mid';
const FALLBACK_STATUS: WishStatus = 'todo';
const FALLBACK_BUDGET_RANGE: BudgetRange | null = null;
const DEFAULT_CREATED_BY = 'guest';

const VALID_CATEGORIES: ReadonlySet<WishCategory> = new Set([
  'anniversary',
  'date',
  'experience',
  'health',
  'beauty',
  'hobby',
  'home',
  'money',
  'family',
  'social',
]);

const VALID_PRIORITIES: ReadonlySet<WishPriority> = new Set(['high', 'mid', 'low']);
const VALID_BUDGET_RANGES: ReadonlySet<BudgetRange> = new Set([
  'free',
  'under_5k',
  'under_10k',
  'under_30k',
  'under_50k',
  'over_50k',
]);

function asString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function asNullableString(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function parseCategory(value: unknown): WishCategory {
  if (typeof value === 'string' && VALID_CATEGORIES.has(value as WishCategory)) {
    return value as WishCategory;
  }
  return FALLBACK_CATEGORY;
}

function parsePriority(value: unknown): WishPriority {
  if (typeof value === 'string') {
    if (value === 'medium') return 'mid';
    if (VALID_PRIORITIES.has(value as WishPriority)) {
      return value as WishPriority;
    }
  }
  return FALLBACK_PRIORITY;
}

function parseStatus(value: unknown): WishStatus {
  if (value === 'done' || value === 'completed') return 'done';
  if (value === 'todo' || value === 'pending') return 'todo';
  return FALLBACK_STATUS;
}

function parseBudgetRange(value: unknown): BudgetRange | null {
  if (typeof value === 'string' && VALID_BUDGET_RANGES.has(value as BudgetRange)) {
    return value as BudgetRange;
  }
  return FALLBACK_BUDGET_RANGE;
}

function normalizeWishBase(row: JsonRow, defaults: { pairId: string; season: string | null; budgetRange: unknown }) {
  const now = new Date().toISOString();
  return {
    id: asString(row.id, `w-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
    pairId: asString(defaults.pairId, ''),
    title: asString(row.title, 'タイトル未設定'),
    category: parseCategory(row.category),
    season: asNullableString(defaults.season),
    priority: parsePriority(row.priority),
    budgetRange: parseBudgetRange(defaults.budgetRange),
    memo: asNullableString(row.memo),
    status: parseStatus(row.status),
    createdBy: asString(row.created_by ?? row.createdBy, DEFAULT_CREATED_BY),
    createdAt: asString(row.created_at ?? row.createdAt, now),
    updatedAt: asString(row.updated_at ?? row.updatedAt, now),
  } satisfies Wish;
}

function mapSnakeRowToWish(row: JsonRow): Wish {
  return normalizeWishBase(row, {
    pairId: asString(row.pair_id, ''),
    season: asNullableString(row.timing),
    budgetRange: row.budget_range,
  });
}

function mapCamelRowToWish(row: JsonRow): Wish {
  return normalizeWishBase(row, {
    pairId: asString(row.pairId, ''),
    season: asNullableString(row.season),
    budgetRange: row.budgetRange,
  });
}

function mapWishToSnakeRow(workspaceId: string, wish: Wish) {
  return {
    id: wish.id,
    pair_id: workspaceId,
    created_by: wish.createdBy || DEFAULT_CREATED_BY,
    title: wish.title,
    category: wish.category,
    priority: wish.priority === 'mid' ? 'medium' : wish.priority,
    timing: wish.season,
    budget_range: wish.budgetRange,
    memo: wish.memo,
    status: wish.status === 'done' ? 'completed' : 'pending',
    created_at: wish.createdAt,
    updated_at: wish.updatedAt,
  };
}

function mapWishToCamelRow(workspaceId: string, wish: Wish) {
  return {
    id: wish.id,
    pairId: workspaceId,
    createdBy: wish.createdBy || DEFAULT_CREATED_BY,
    title: wish.title,
    category: wish.category,
    priority: wish.priority,
    season: wish.season,
    budgetRange: wish.budgetRange,
    memo: wish.memo,
    status: wish.status,
    createdAt: wish.createdAt,
    updatedAt: wish.updatedAt,
  };
}

function unique(ids: string[]) {
  return Array.from(new Set(ids));
}

async function ensureSnakeSchemaRefs(workspaceId: string) {
  const userId = DEFAULT_CREATED_BY;
  await supabase.from('users').upsert(
    {
      id: userId,
      device_id: userId,
      nudge_level: 1,
    },
    { onConflict: 'id' },
  );

  await supabase.from('pairs').upsert(
    {
      id: workspaceId,
      user1_id: userId,
      invite_code: workspaceId,
      status: 'active',
    },
    { onConflict: 'id' },
  );
}

async function fetchSnakeWorkspaceWishes(workspaceId: string) {
  const { data, error } = await supabase
    .from('wishes')
    .select('*')
    .eq('pair_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) return { data: null as Wish[] | null, error };
  return { data: (data ?? []).map((row) => mapSnakeRowToWish(row as JsonRow)), error: null };
}

async function fetchCamelWorkspaceWishes(workspaceId: string) {
  const { data, error } = await supabase
    .from('wishes')
    .select('*')
    .eq('pairId', workspaceId)
    .order('createdAt', { ascending: false });

  if (error) return { data: null as Wish[] | null, error };
  return { data: (data ?? []).map((row) => mapCamelRowToWish(row as JsonRow)), error: null };
}

async function syncSnakeWorkspaceWishes(workspaceId: string, wishes: Wish[]) {
  await ensureSnakeSchemaRefs(workspaceId);

  const { data: existingRows, error: existingError } = await supabase.from('wishes').select('id').eq('pair_id', workspaceId);
  if (existingError) return existingError;

  const existingIds = (existingRows ?? [])
    .map((row) => asString((row as JsonRow).id, ''))
    .filter((id) => id.length > 0);
  const localIds = new Set(wishes.map((wish) => wish.id));
  const staleIds = unique(existingIds.filter((id) => !localIds.has(id)));

  if (staleIds.length > 0) {
    const { error: deleteError } = await supabase.from('wishes').delete().eq('pair_id', workspaceId).in('id', staleIds);
    if (deleteError) return deleteError;
  }

  if (wishes.length === 0) return null;

  const payload = wishes.map((wish) => mapWishToSnakeRow(workspaceId, wish));
  const { error: upsertError } = await supabase.from('wishes').upsert(payload, { onConflict: 'id' });
  return upsertError;
}

async function syncCamelWorkspaceWishes(workspaceId: string, wishes: Wish[]) {
  const { data: existingRows, error: existingError } = await supabase.from('wishes').select('id').eq('pairId', workspaceId);
  if (existingError) return existingError;

  const existingIds = (existingRows ?? [])
    .map((row) => asString((row as JsonRow).id, ''))
    .filter((id) => id.length > 0);
  const localIds = new Set(wishes.map((wish) => wish.id));
  const staleIds = unique(existingIds.filter((id) => !localIds.has(id)));

  if (staleIds.length > 0) {
    const { error: deleteError } = await supabase.from('wishes').delete().eq('pairId', workspaceId).in('id', staleIds);
    if (deleteError) return deleteError;
  }

  if (wishes.length === 0) return null;

  const payload = wishes.map((wish) => mapWishToCamelRow(workspaceId, wish));
  const { error: upsertError } = await supabase.from('wishes').upsert(payload, { onConflict: 'id' });
  return upsertError;
}

export function isSharedWorkspaceId(workspaceId: string) {
  return workspaceId.startsWith('shared-');
}

export async function fetchSharedWishesFromSupabase(workspaceId: string): Promise<Wish[] | null> {
  const snake = await fetchSnakeWorkspaceWishes(workspaceId);
  if (!snake.error && snake.data) {
    return snake.data;
  }

  const camel = await fetchCamelWorkspaceWishes(workspaceId);
  if (!camel.error && camel.data) {
    return camel.data;
  }

  if (snake.error || camel.error) {
    console.warn('[WishProvider] Failed to read wishes from Supabase', {
      workspaceId,
      snake: snake.error?.message,
      camel: camel.error?.message,
    });
  }

  return null;
}

export async function syncSharedWishesToSupabase(workspaceId: string, wishes: Wish[]) {
  const snakeError = await syncSnakeWorkspaceWishes(workspaceId, wishes);
  if (!snakeError) return;

  const camelError = await syncCamelWorkspaceWishes(workspaceId, wishes);
  if (!camelError) return;

  console.warn('[WishProvider] Failed to sync wishes to Supabase', {
    workspaceId,
    snake: snakeError.message,
    camel: camelError.message,
  });
}
