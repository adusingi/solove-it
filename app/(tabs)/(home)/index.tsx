import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ChevronRight, Plus, Sparkles } from 'lucide-react-native';
import React, { useCallback, useRef } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ProgressBar from '@/components/ProgressBar';
import { CATEGORIES, CATEGORY_MAP, PRIORITY_LABELS, SEASON_LABELS } from '@/constants/categories';
import Colors from '@/constants/colors';
import { useWishes } from '@/providers/WishProvider';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { stats, nextCandidates, isLoading, isSharedWorkspace, activeWorkspaceId } = useWishes();
  const fabScale = useRef(new Animated.Value(1)).current;
  const workspaceLabel =
    activeWorkspaceId.length > 14 ? `${activeWorkspaceId.slice(0, 14)}...` : activeWorkspaceId;

  const handleFabPress = useCallback(() => {
    Animated.sequence([
      Animated.timing(fabScale, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.spring(fabScale, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }),
    ]).start(() => {
      router.push('/add-wish');
    });
  }, [router, fabScale]);

  const activeCategoryStats = CATEGORIES.filter((c) => stats.categoryStats[c.key]);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#FFF0EC', '#FAFAF8', '#FAFAF8']}
        style={[styles.gradient, { paddingTop: insets.top }]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>{isSharedWorkspace ? '共有中の' : 'わたしの'}</Text>
              <View style={styles.headerTitleRow}>
                <Text style={styles.headerTitle}>やりたいことリスト 💕</Text>
                {isSharedWorkspace && (
                  <View style={styles.sharedBadge}>
                    <Text style={styles.sharedBadgeText}>{workspaceLabel}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={styles.heroCard}>
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroGradient}
            >
              <View style={styles.heroContent}>
                <Text style={styles.heroLabel}>全体の達成率</Text>
                <View style={styles.heroRow}>
                  <Text style={styles.heroPercent}>{stats.overallRate}</Text>
                  <Text style={styles.heroPercentSign}>%</Text>
                  <View style={styles.heroMeta}>
                    <Text style={styles.heroMetaText}>
                      {stats.done} / {stats.total} 達成
                    </Text>
                  </View>
                </View>
                <View style={styles.heroBarContainer}>
                  <ProgressBar
                    progress={stats.overallRate}
                    color="rgba(255,255,255,0.95)"
                    backgroundColor="rgba(255,255,255,0.25)"
                    height={10}
                  />
                </View>
              </View>
            </LinearGradient>
          </View>

          {activeCategoryStats.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>カテゴリ別の進捗</Text>
              <View style={styles.categoryGrid}>
                {activeCategoryStats.map((cat) => {
                  const s = stats.categoryStats[cat.key];
                  return (
                    <View key={cat.key} style={styles.categoryCard}>
                      <View style={styles.categoryHeader}>
                        <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                        <Text style={styles.categoryLabel} numberOfLines={1}>
                          {cat.label}
                        </Text>
                      </View>
                      <Text style={[styles.categoryRate, { color: cat.color }]}>
                        {s.rate}%
                      </Text>
                      <ProgressBar
                        progress={s.rate}
                        color={cat.color}
                        height={5}
                      />
                      <Text style={styles.categoryStat}>
                        {s.done}/{s.total}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {nextCandidates.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Sparkles size={18} color={Colors.secondary} />
                <Text style={styles.sectionTitle}>次にやる候補</Text>
              </View>
              {nextCandidates.map((wish, index) => {
                const cat = CATEGORY_MAP[wish.category];
                return (
                  <Pressable
                    key={wish.id}
                    style={styles.candidateCard}
                    onPress={() => router.push(`/edit-wish?id=${wish.id}`)}
                  >
                    <View style={styles.candidateRank}>
                      <Text style={styles.candidateRankText}>{index + 1}</Text>
                    </View>
                    <View style={styles.candidateContent}>
                      <Text style={styles.candidateTitle} numberOfLines={1}>
                        {wish.title}
                      </Text>
                      <View style={styles.candidateTags}>
                        <Text style={[styles.candidateTag, { color: cat.color }]}>
                          {cat.emoji} {cat.label}
                        </Text>
                        <Text style={styles.candidateTagSep}>·</Text>
                        <Text style={[styles.candidateTag, { color: Colors.priorityColors[wish.priority] }]}>
                          優先度: {PRIORITY_LABELS[wish.priority]}
                        </Text>
                        {wish.season && (
                          <>
                            <Text style={styles.candidateTagSep}>·</Text>
                            <Text style={[styles.candidateTag, { color: Colors.accent }]}>
                              {SEASON_LABELS[wish.season] ?? wish.season}
                            </Text>
                          </>
                        )}
                      </View>
                    </View>
                    <ChevronRight size={16} color={Colors.textTertiary} />
                  </Pressable>
                );
              })}
            </View>
          )}

          {stats.total === 0 && !isLoading && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>✨</Text>
              <Text style={styles.emptyTitle}>まだ何もないよ！</Text>
              <Text style={styles.emptyText}>
                ふたりの「やりたいこと」を{'\n'}追加してみよう
              </Text>
            </View>
          )}
        </ScrollView>
      </LinearGradient>

      <Animated.View style={[styles.fabContainer, { bottom: insets.bottom + 90, transform: [{ scale: fabScale }] }]}>
        <Pressable onPress={handleFabPress} style={styles.fab} testID="add-wish-fab">
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
  gradient: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sharedBadge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sharedBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  heroCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    overflow: 'hidden',
    ...Colors.shadow.large,
  },
  heroGradient: {
    borderRadius: 20,
  },
  heroContent: {
    padding: 22,
  },
  heroLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 14,
  },
  heroPercent: {
    fontSize: 52,
    fontWeight: '800' as const,
    color: '#fff',
    letterSpacing: -2,
  },
  heroPercentSign: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 2,
  },
  heroMeta: {
    marginLeft: 12,
  },
  heroMetaText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500' as const,
  },
  heroBarContainer: {
    marginTop: 2,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    width: '47%' as unknown as number,
    flexGrow: 1,
    ...Colors.shadow.small,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  categoryEmoji: {
    fontSize: 18,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    flex: 1,
  },
  categoryRate: {
    fontSize: 22,
    fontWeight: '800' as const,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  categoryStat: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 4,
    fontWeight: '500' as const,
  },
  candidateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    ...Colors.shadow.small,
  },
  candidateRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  candidateRankText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  candidateContent: {
    flex: 1,
    marginRight: 8,
  },
  candidateTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  candidateTags: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  candidateTag: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  candidateTagSep: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginHorizontal: 4,
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
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
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
