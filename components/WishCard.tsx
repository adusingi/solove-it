import * as Haptics from 'expo-haptics';
import { Check, ChevronRight } from 'lucide-react-native';
import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/colors';
import { BUDGET_LABELS, CATEGORY_MAP, PRIORITY_LABELS, SEASON_LABELS } from '@/constants/categories';
import { Wish } from '@/types/wish';

interface WishCardProps {
  wish: Wish;
  onToggle: (id: string) => void;
  onPress: (id: string) => void;
}

export default React.memo(function WishCard({ wish, onToggle, onPress }: WishCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const checkScale = useRef(new Animated.Value(wish.status === 'done' ? 1 : 0)).current;
  const category = CATEGORY_MAP[wish.category];
  const isDone = wish.status === 'done';

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.spring(checkScale, {
        toValue: isDone ? 0 : 1,
        useNativeDriver: true,
        tension: 200,
        friction: 10,
      }),
    ]).start();
    onToggle(wish.id);
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        style={styles.card}
        onPress={() => onPress(wish.id)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        testID={`wish-card-${wish.id}`}
      >
        <Pressable
          onPress={handleToggle}
          style={[
            styles.checkbox,
            isDone && { backgroundColor: Colors.success, borderColor: Colors.success },
          ]}
          testID={`wish-toggle-${wish.id}`}
          hitSlop={8}
        >
          {isDone && <Check size={14} color="#fff" strokeWidth={3} />}
        </Pressable>

        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text style={[styles.title, isDone && styles.titleDone]} numberOfLines={1}>
              {wish.title}
            </Text>
          </View>

          <View style={styles.tags}>
            <View style={[styles.tag, { backgroundColor: category?.color + '18' }]}>
              <Text style={[styles.tagText, { color: category?.color }]}>
                {category?.emoji} {category?.label}
              </Text>
            </View>

            <View style={[styles.tag, { backgroundColor: Colors.priorityColors[wish.priority] + '18' }]}>
              <Text style={[styles.tagText, { color: Colors.priorityColors[wish.priority] }]}>
                {PRIORITY_LABELS[wish.priority]}
              </Text>
            </View>

            {wish.season && (
              <View style={[styles.tag, { backgroundColor: Colors.accent + '18' }]}>
                <Text style={[styles.tagText, { color: Colors.accent }]}>
                  {SEASON_LABELS[wish.season] ?? wish.season}
                </Text>
              </View>
            )}

            {wish.budgetRange && (
              <View style={[styles.tag, { backgroundColor: Colors.secondary + '18' }]}>
                <Text style={[styles.tagText, { color: Colors.secondary }]}>
                  {BUDGET_LABELS[wish.budgetRange]}
                </Text>
              </View>
            )}
          </View>
        </View>

        <ChevronRight size={18} color={Colors.textTertiary} />
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    ...Colors.shadow.medium,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    flex: 1,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: Colors.textTertiary,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
});
