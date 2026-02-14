import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { SAMPLE_WISHES } from '@/mocks/wishes';
import {
  NotificationSettings,
  Wish,
  WishCategory,
  WishPriority,
  WishStatus,
} from '@/types/wish';

const WISHES_KEY = 'wishes_data';
const NOTIF_KEY = 'notification_settings';
const INITIALIZED_KEY = 'app_initialized';

const DEFAULT_NOTIFICATION: NotificationSettings = {
  enabled: true,
  annoyanceLevel: 1,
  timeWindow: 'noon',
  highPriorityOnly: false,
};

export const [WishProvider, useWishes] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION);

  const wishesQuery = useQuery({
    queryKey: ['wishes'],
    queryFn: async () => {
      const initialized = await AsyncStorage.getItem(INITIALIZED_KEY);
      if (!initialized) {
        await AsyncStorage.setItem(WISHES_KEY, JSON.stringify(SAMPLE_WISHES));
        await AsyncStorage.setItem(INITIALIZED_KEY, 'true');
        console.log('[WishProvider] Initialized with sample data');
        return SAMPLE_WISHES;
      }
      const stored = await AsyncStorage.getItem(WISHES_KEY);
      return stored ? (JSON.parse(stored) as Wish[]) : [];
    },
  });

  const notifQuery = useQuery({
    queryKey: ['notificationSettings'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(NOTIF_KEY);
      return stored ? (JSON.parse(stored) as NotificationSettings) : DEFAULT_NOTIFICATION;
    },
  });

  useEffect(() => {
    if (wishesQuery.data) {
      setWishes(wishesQuery.data);
    }
  }, [wishesQuery.data]);

  useEffect(() => {
    if (notifQuery.data) {
      setNotificationSettings(notifQuery.data);
    }
  }, [notifQuery.data]);

  const { mutate: persistWishesMutate } = useMutation({
    mutationFn: async (updated: Wish[]) => {
      await AsyncStorage.setItem(WISHES_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['wishes'], data);
    },
  });

  const { mutate: persistNotifMutate } = useMutation({
    mutationFn: async (settings: NotificationSettings) => {
      await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(settings));
      return settings;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['notificationSettings'], data);
    },
  });

  const addWish = useCallback(
    (wish: Omit<Wish, 'id' | 'pairId' | 'createdBy' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      const newWish: Wish = {
        ...wish,
        id: `w-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        pairId: 'pair-1',
        createdBy: 'user-1',
        createdAt: now,
        updatedAt: now,
      };
      const updated = [newWish, ...wishes];
      setWishes(updated);
      persistWishesMutate(updated);
      console.log('[WishProvider] Added wish:', newWish.title);
    },
    [wishes, persistWishesMutate],
  );

  const updateWish = useCallback(
    (id: string, updates: Partial<Wish>) => {
      const updated = wishes.map((w) =>
        w.id === id ? { ...w, ...updates, updatedAt: new Date().toISOString() } : w,
      );
      setWishes(updated);
      persistWishesMutate(updated);
      console.log('[WishProvider] Updated wish:', id);
    },
    [wishes, persistWishesMutate],
  );

  const deleteWish = useCallback(
    (id: string) => {
      const updated = wishes.filter((w) => w.id !== id);
      setWishes(updated);
      persistWishesMutate(updated);
      console.log('[WishProvider] Deleted wish:', id);
    },
    [wishes, persistWishesMutate],
  );

  const toggleWishStatus = useCallback(
    (id: string) => {
      const wish = wishes.find((w) => w.id === id);
      if (!wish) return;
      const newStatus: WishStatus = wish.status === 'todo' ? 'done' : 'todo';
      updateWish(id, { status: newStatus });
      console.log('[WishProvider] Toggled wish status:', id, '->', newStatus);
    },
    [wishes, updateWish],
  );

  const updateNotificationSettings = useCallback(
    (updates: Partial<NotificationSettings>) => {
      const updated = { ...notificationSettings, ...updates };
      setNotificationSettings(updated);
      persistNotifMutate(updated);
      console.log('[WishProvider] Updated notification settings:', updates);
    },
    [notificationSettings, persistNotifMutate],
  );

  const stats = useMemo(() => {
    const total = wishes.length;
    const done = wishes.filter((w) => w.status === 'done').length;
    const overallRate = total === 0 ? 0 : Math.round((done / total) * 100);

    const categoryStats: Record<string, { total: number; done: number; rate: number }> = {};
    wishes.forEach((w) => {
      if (!categoryStats[w.category]) {
        categoryStats[w.category] = { total: 0, done: 0, rate: 0 };
      }
      categoryStats[w.category].total++;
      if (w.status === 'done') categoryStats[w.category].done++;
    });
    Object.values(categoryStats).forEach((s) => {
      s.rate = s.total === 0 ? 0 : Math.round((s.done / s.total) * 100);
    });

    return { total, done, overallRate, categoryStats };
  }, [wishes]);

  const nextCandidates = useMemo(() => {
    const priorityScore: Record<WishPriority, number> = { high: 3, mid: 2, low: 1 };
    const seasonScore: Record<string, number> = { this_month: 3, next_month: 2, someday: 1 };

    return wishes
      .filter((w) => w.status === 'todo')
      .map((w) => ({
        ...w,
        score: priorityScore[w.priority] + (seasonScore[w.season ?? 'someday'] ?? 1),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [wishes]);

  return {
    wishes,
    notificationSettings,
    stats,
    nextCandidates,
    isLoading: wishesQuery.isLoading,
    addWish,
    updateWish,
    deleteWish,
    toggleWishStatus,
    updateNotificationSettings,
  };
});

export function useFilteredWishes(
  categoryFilter: WishCategory | 'all',
  priorityFilter: WishPriority | 'all',
  statusFilter: WishStatus | 'all',
  sortBy: 'priority' | 'season' | 'budget' | 'created',
) {
  const { wishes } = useWishes();

  return useMemo(() => {
    let filtered = [...wishes];

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((w) => w.category === categoryFilter);
    }
    if (priorityFilter !== 'all') {
      filtered = filtered.filter((w) => w.priority === priorityFilter);
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter((w) => w.status === statusFilter);
    }

    const priorityOrder: Record<WishPriority, number> = { high: 3, mid: 2, low: 1 };
    const seasonOrder: Record<string, number> = { this_month: 3, next_month: 2, someday: 1 };

    switch (sortBy) {
      case 'priority':
        filtered.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
        break;
      case 'season':
        filtered.sort(
          (a, b) => (seasonOrder[b.season ?? 'someday'] ?? 0) - (seasonOrder[a.season ?? 'someday'] ?? 0),
        );
        break;
      case 'created':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      default:
        break;
    }

    return filtered;
  }, [wishes, categoryFilter, priorityFilter, statusFilter, sortBy]);
}
