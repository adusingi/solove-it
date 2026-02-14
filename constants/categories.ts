import { CategoryInfo, WishCategory } from '@/types/wish';
import Colors from '@/constants/colors';

export const CATEGORIES: CategoryInfo[] = [
  { key: 'anniversary', label: '記念日・イベント', emoji: '🎉', color: Colors.categoryColors.anniversary },
  { key: 'date', label: 'デート', emoji: '💕', color: Colors.categoryColors.date },
  { key: 'experience', label: '体験・学び', emoji: '✨', color: Colors.categoryColors.experience },
  { key: 'health', label: '健康・運動', emoji: '💪', color: Colors.categoryColors.health },
  { key: 'beauty', label: '美容・リラックス', emoji: '🧖', color: Colors.categoryColors.beauty },
  { key: 'hobby', label: '趣味・創作', emoji: '🎨', color: Colors.categoryColors.hobby },
  { key: 'home', label: '家・暮らし', emoji: '🏠', color: Colors.categoryColors.home },
  { key: 'money', label: 'お金・ライフプラン', emoji: '💰', color: Colors.categoryColors.money },
  { key: 'family', label: '家族・友人', emoji: '👨‍👩‍👧', color: Colors.categoryColors.family },
  { key: 'social', label: '社会貢献', emoji: '🌍', color: Colors.categoryColors.social },
];

export const CATEGORY_MAP: Record<WishCategory, CategoryInfo> = CATEGORIES.reduce(
  (acc, cat) => ({ ...acc, [cat.key]: cat }),
  {} as Record<WishCategory, CategoryInfo>
);

export const PRIORITY_LABELS: Record<string, string> = {
  high: '高',
  mid: '中',
  low: '低',
};

export const SEASON_LABELS: Record<string, string> = {
  this_month: '今月',
  next_month: '来月',
  someday: 'いつか',
};

export const BUDGET_LABELS: Record<string, string> = {
  free: '無料',
  under_5k: '〜5,000円',
  under_10k: '〜10,000円',
  under_30k: '〜30,000円',
  under_50k: '〜50,000円',
  over_50k: '50,000円〜',
};

export const ANNOYANCE_LABELS: Record<number, { label: string; description: string; emoji: string }> = {
  0: { label: '静か', description: '週1回', emoji: '😌' },
  1: { label: '普通', description: '週2回', emoji: '🙂' },
  2: { label: 'しつこい', description: '毎日', emoji: '😤' },
  3: { label: '鬼', description: '1日2回', emoji: '👹' },
};

export const NUDGE_MESSAGES: Record<number, string[]> = {
  0: ['今週の候補：{title}'],
  1: ['そろそろ「{title}」やらない？', '「{title}」どう？週末にでも！'],
  2: ['まだ「{title}」が残ってるよ（圧）', '「{title}」忘れてない？ねぇ？'],
  3: ['「{title}」やるまで帰れま10🔥', '「{title}」まだ？まだ？まだ？！', 'おーい！「{title}」！聞こえてる？！'],
};
