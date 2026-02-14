import * as Haptics from 'expo-haptics';
import { MapPin, Search } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import EventCard from '@/components/EventCard';
import Colors from '@/constants/colors';
import { MOCK_EVENTS } from '@/mocks/events';
import { useWishes } from '@/providers/WishProvider';
import { MockEvent } from '@/types/wish';

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const { addWish } = useWishes();
  const [searchArea, setSearchArea] = useState('岡山');
  const [addedEvents, setAddedEvents] = useState<Set<string>>(new Set());

  const filteredEvents = useMemo(() => {
    if (!searchArea.trim()) return MOCK_EVENTS;
    return MOCK_EVENTS.filter(
      (e) =>
        e.area.includes(searchArea) ||
        e.title.includes(searchArea) ||
        e.venue.includes(searchArea) ||
        e.tags.some((t) => t.includes(searchArea)),
    );
  }, [searchArea]);

  const handleAddToWish = useCallback(
    (event: MockEvent) => {
      addWish({
        title: event.title,
        category: 'date',
        season: 'someday',
        priority: 'mid',
        budgetRange: null,
        memo: `${event.venue}（${event.dateFrom}${event.dateTo ? ' 〜 ' + event.dateTo : ''}）\n${event.description}`,
        status: 'todo',
      });
      setAddedEvents((prev) => new Set(prev).add(event.id));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('追加しました！', `「${event.title}」をやりたいことリストに追加しました`, [{ text: 'OK' }]);
    },
    [addWish],
  );

  const renderItem = useCallback(
    ({ item }: { item: MockEvent }) => (
      <EventCard
        event={item}
        onAddToWish={handleAddToWish}
        alreadyAdded={addedEvents.has(item.id)}
      />
    ),
    [handleAddToWish, addedEvents],
  );

  const keyExtractor = useCallback((item: MockEvent) => item.id, []);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>イベント探索</Text>
        <Text style={styles.headerSub}>気になるイベントをやりたいことに追加しよう</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={18} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="エリアで検索（例：岡山）"
            placeholderTextColor={Colors.textTertiary}
            value={searchArea}
            onChangeText={setSearchArea}
            testID="event-search-input"
          />
          <View style={styles.searchBadge}>
            <MapPin size={12} color={Colors.primary} />
          </View>
        </View>
      </View>

      <FlatList
        data={filteredEvents}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🗺️</Text>
            <Text style={styles.emptyTitle}>イベントが見つかりません</Text>
            <Text style={styles.emptyText}>別のエリアで検索してみてね</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: Colors.surface,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    padding: 0,
  },
  searchBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
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
});
