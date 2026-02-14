import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Plus, SlidersHorizontal } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import FilterChip from '@/components/FilterChip';
import WishCard from '@/components/WishCard';
import Colors from '@/constants/colors';
import { CATEGORIES, PRIORITY_LABELS } from '@/constants/categories';
import { useFilteredWishes, useWishes } from '@/providers/WishProvider';
import { FilterCategory, FilterPriority, FilterStatus, SortOption, WishCategory, WishPriority, WishStatus } from '@/types/wish';

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'priority', label: '優先度順' },
  { key: 'season', label: '時期順' },
  { key: 'created', label: '作成日順' },
];

const STATUS_OPTIONS: { key: FilterStatus; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'todo', label: '未達成' },
  { key: 'done', label: '達成済' },
];

export default function ListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { toggleWishStatus } = useWishes();

  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('all');
  const [priorityFilter, setPriorityFilter] = useState<FilterPriority>('all');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortOption>('priority');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useFilteredWishes(
    categoryFilter as WishCategory | 'all',
    priorityFilter as WishPriority | 'all',
    statusFilter as WishStatus | 'all',
    sortBy,
  );

  const fabScale = useRef(new Animated.Value(1)).current;

  const handleFabPress = useCallback(() => {
    Animated.sequence([
      Animated.timing(fabScale, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.spring(fabScale, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }),
    ]).start(() => {
      router.push('/add-wish');
    });
  }, [router, fabScale]);

  const handleToggle = useCallback((id: string) => {
    toggleWishStatus(id);
  }, [toggleWishStatus]);

  const handlePress = useCallback((id: string) => {
    router.push(`/edit-wish?id=${id}`);
  }, [router]);

  const renderItem = useCallback(({ item }: { item: typeof filtered[0] }) => (
    <WishCard wish={item} onToggle={handleToggle} onPress={handlePress} />
  ), [handleToggle, handlePress]);

  const keyExtractor = useCallback((item: typeof filtered[0]) => item.id, []);

  const categoryFilterOptions = useMemo(() => [
    { key: 'all' as const, label: 'すべて', color: Colors.primary },
    ...CATEGORIES.map((c) => ({ key: c.key, label: `${c.emoji} ${c.label}`, color: c.color })),
  ], []);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>やりたいことリスト</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setShowFilters(!showFilters)}
            style={[styles.filterBtn, showFilters && styles.filterBtnActive]}
          >
            <SlidersHorizontal size={18} color={showFilters ? '#fff' : Colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.statusRow}>
        {STATUS_OPTIONS.map((opt) => (
          <Pressable
            key={opt.key}
            onPress={() => setStatusFilter(opt.key)}
            style={[styles.statusTab, statusFilter === opt.key && styles.statusTabActive]}
          >
            <Text style={[styles.statusTabText, statusFilter === opt.key && styles.statusTabTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {showFilters && (
        <View style={styles.filtersContainer}>
          <Text style={styles.filterLabel}>カテゴリ</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <View style={styles.filterRow}>
              {categoryFilterOptions.map((opt) => (
                <FilterChip
                  key={opt.key}
                  label={opt.label}
                  selected={categoryFilter === opt.key}
                  onPress={() => setCategoryFilter(opt.key)}
                  color={opt.color}
                />
              ))}
            </View>
          </ScrollView>

          <Text style={styles.filterLabel}>優先度</Text>
          <View style={styles.filterRow}>
            <FilterChip
              label="すべて"
              selected={priorityFilter === 'all'}
              onPress={() => setPriorityFilter('all')}
            />
            {(['high', 'mid', 'low'] as const).map((p) => (
              <FilterChip
                key={p}
                label={PRIORITY_LABELS[p]}
                selected={priorityFilter === p}
                onPress={() => setPriorityFilter(p)}
                color={Colors.priorityColors[p]}
              />
            ))}
          </View>

          <Text style={styles.filterLabel}>並び替え</Text>
          <View style={styles.filterRow}>
            {SORT_OPTIONS.map((opt) => (
              <FilterChip
                key={opt.key}
                label={opt.label}
                selected={sortBy === opt.key}
                onPress={() => setSortBy(opt.key)}
                color={Colors.accent}
              />
            ))}
          </View>
        </View>
      )}

      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>
              {categoryFilter !== 'all' || priorityFilter !== 'all' || statusFilter !== 'all'
                ? '条件に合うものがないよ'
                : 'まだ何もないよ！'}
            </Text>
            <Text style={styles.emptyText}>
              {categoryFilter !== 'all' || priorityFilter !== 'all' || statusFilter !== 'all'
                ? 'フィルタを変えてみてね'
                : '＋ボタンで追加しよう'}
            </Text>
          </View>
        }
      />

      <Animated.View style={[styles.fabContainer, { bottom: insets.bottom + 90, transform: [{ scale: fabScale }] }]}>
        <Pressable onPress={handleFabPress} style={styles.fab} testID="add-wish-fab-list">
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            style={styles.fabGradient}
          >
            <Plus size={26} color="#fff" strokeWidth={2.5} />
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.borderLight,
  },
  filterBtnActive: {
    backgroundColor: Colors.primary,
  },
  statusRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 0,
    backgroundColor: Colors.surface,
  },
  statusTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  statusTabActive: {
    backgroundColor: Colors.primaryLight,
  },
  statusTabText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
  },
  statusTabTextActive: {
    color: Colors.primary,
  },
  filtersContainer: {
    backgroundColor: Colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
    marginBottom: 6,
    marginTop: 8,
  },
  filterScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 0,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  fabContainer: {
    position: 'absolute',
    right: 20,
    zIndex: 100,
  },
  fab: {
    borderRadius: 28,
    overflow: 'hidden',
    ...Colors.shadow.large,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
