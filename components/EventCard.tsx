import * as Haptics from 'expo-haptics';
import { Calendar, MapPin, Plus } from 'lucide-react-native';
import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/colors';
import { MockEvent } from '@/types/wish';

interface EventCardProps {
  event: MockEvent;
  onAddToWish: (event: MockEvent) => void;
  alreadyAdded?: boolean;
}

export default React.memo(function EventCard({ event, onAddToWish, alreadyAdded }: EventCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, tension: 300, friction: 10 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }).start();
  };

  const handleAdd = () => {
    if (alreadyAdded) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }),
    ]).start();
    onAddToWish(event);
  };

  const dateDisplay = event.dateTo
    ? `${event.dateFrom} 〜 ${event.dateTo}`
    : event.dateFrom;

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        style={styles.card}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title} numberOfLines={2}>{event.title}</Text>
          </View>
          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <Pressable
              onPress={handleAdd}
              style={[styles.addBtn, alreadyAdded && styles.addBtnDone]}
              testID={`event-add-${event.id}`}
            >
              {alreadyAdded ? (
                <Text style={styles.addedText}>追加済</Text>
              ) : (
                <>
                  <Plus size={14} color="#fff" strokeWidth={3} />
                  <Text style={styles.addText}>追加</Text>
                </>
              )}
            </Pressable>
          </Animated.View>
        </View>

        <Text style={styles.description} numberOfLines={2}>{event.description}</Text>

        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Calendar size={13} color={Colors.textTertiary} />
            <Text style={styles.metaText}>{dateDisplay}</Text>
          </View>
          <View style={styles.metaItem}>
            <MapPin size={13} color={Colors.textTertiary} />
            <Text style={styles.metaText}>{event.venue}</Text>
          </View>
        </View>

        <View style={styles.tagsRow}>
          {event.tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    ...Colors.shadow.medium,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    lineHeight: 22,
  },
  description: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 10,
  },
  meta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tag: {
    backgroundColor: Colors.accent + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    color: Colors.accent,
    fontWeight: '500' as const,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnDone: {
    backgroundColor: Colors.textTertiary,
  },
  addText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  addedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500' as const,
  },
});
