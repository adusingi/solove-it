export type WishCategory =
  | 'anniversary'
  | 'date'
  | 'experience'
  | 'health'
  | 'beauty'
  | 'hobby'
  | 'home'
  | 'money'
  | 'family'
  | 'social';

export type WishPriority = 'high' | 'mid' | 'low';

export type WishStatus = 'todo' | 'done';

export type WishSeason = 'this_month' | 'next_month' | 'someday' | string;

export type BudgetRange = 'free' | 'under_5k' | 'under_10k' | 'under_30k' | 'under_50k' | 'over_50k';

export interface Wish {
  id: string;
  pairId: string;
  title: string;
  category: WishCategory;
  season: WishSeason | null;
  priority: WishPriority;
  budgetRange: BudgetRange | null;
  memo: string | null;
  status: WishStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type AnnoyanceLevel = 0 | 1 | 2 | 3;
export type TimeWindow = 'morning' | 'noon' | 'night';

export interface NotificationSettings {
  enabled: boolean;
  annoyanceLevel: AnnoyanceLevel;
  timeWindow: TimeWindow;
  highPriorityOnly: boolean;
}

export interface MockEvent {
  id: string;
  title: string;
  dateFrom: string;
  dateTo: string | null;
  area: string;
  venue: string;
  url: string;
  tags: string[];
  description: string;
}

export interface CategoryInfo {
  key: WishCategory;
  label: string;
  emoji: string;
  color: string;
}

export type SortOption = 'priority' | 'season' | 'budget' | 'created';
export type FilterCategory = WishCategory | 'all';
export type FilterPriority = WishPriority | 'all';
export type FilterStatus = WishStatus | 'all';
