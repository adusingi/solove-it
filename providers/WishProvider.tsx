import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { SAMPLE_WISHES } from '@/mocks/wishes';
import {
  fetchSharedWishesFromSupabase,
  isSharedWorkspaceId,
  syncSharedWishesToSupabase,
} from '@/services/supabaseWishSync';
import {
  NotificationSettings,
  Wish,
  WishCategory,
  WishPriority,
  WishStatus,
} from '@/types/wish';

const DEFAULT_WORKSPACE_ID = 'shared-main';
const ACTIVE_WORKSPACE_KEY = 'active_workspace_id';
const WISHES_KEY_PREFIX = 'wishes_data';
const LEGACY_WISHES_KEY = 'wishes_data';
const NOTIF_KEY = 'notification_settings';
const INITIALIZED_KEY_PREFIX = 'app_initialized';
const LEGACY_INITIALIZED_KEY = 'app_initialized';

const DEFAULT_NOTIFICATION: NotificationSettings = {
  enabled: true,
  annoyanceLevel: 1,
  timeWindow: 'noon',
  highPriorityOnly: false,
};

type WorkspaceSwitchOptions = {
  snapshot?: Wish[];
};

function getWishesKey(workspaceId: string) {
  return `${WISHES_KEY_PREFIX}:${workspaceId}`;
}

function getInitializedKey(workspaceId: string) {
  return `${INITIALIZED_KEY_PREFIX}:${workspaceId}`;
}

function normalizeWorkspaceId(workspaceId: string | null | undefined) {
  if (!workspaceId) return DEFAULT_WORKSPACE_ID;
  const trimmed = workspaceId.trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_WORKSPACE_ID;
}

function parseSnapshot(rawSnapshot: unknown) {
  if (typeof rawSnapshot !== 'string' || !rawSnapshot) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(rawSnapshot) as unknown;
    if (Array.isArray(parsed)) {
      return parsed as Wish[];
    }
  } catch {
    try {
      const decoded = decodeURIComponent(rawSnapshot);
      const parsed = JSON.parse(decoded) as unknown;
      if (Array.isArray(parsed)) {
        return parsed as Wish[];
      }
    } catch {
      return undefined;
    }
  }

  return undefined;
}

function parseStoredWishes(raw: string | null): Wish[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as Wish[]) : [];
  } catch {
    return [];
  }
}

function generateWorkspaceId() {
  return `shared-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export const [WishProvider, useWishes] = createContextHook(() => {
  const queryClient = useQueryClient();
  const currentUrl = Linking.useURL();
  const handledUrlRef = useRef<string | null>(null);
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(DEFAULT_WORKSPACE_ID);
  const [workspaceReady, setWorkspaceReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function bootstrapWorkspace() {
      try {
        const storedWorkspaceId = await AsyncStorage.getItem(ACTIVE_WORKSPACE_KEY);
        if (mounted && storedWorkspaceId) {
          setActiveWorkspaceId(normalizeWorkspaceId(storedWorkspaceId));
        }
      } finally {
        if (mounted) {
          setWorkspaceReady(true);
        }
      }
    }

    bootstrapWorkspace();

    return () => {
      mounted = false;
    };
  }, []);

  const switchWorkspace = useCallback(
    async (workspaceIdInput: string, options?: WorkspaceSwitchOptions) => {
      const workspaceId = normalizeWorkspaceId(workspaceIdInput);
      const snapshot = options?.snapshot;
      const wishesKey = getWishesKey(workspaceId);
      const initializedKey = getInitializedKey(workspaceId);

      if (snapshot && snapshot.length > 0) {
        const existing = await AsyncStorage.getItem(wishesKey);
        let shouldSeedSnapshot = !existing;

        if (existing) {
          try {
            const existingWishes = JSON.parse(existing) as unknown;
            shouldSeedSnapshot = !Array.isArray(existingWishes) || existingWishes.length === 0;
          } catch {
            shouldSeedSnapshot = true;
          }
        }

        if (shouldSeedSnapshot) {
          await AsyncStorage.setItem(wishesKey, JSON.stringify(snapshot));
          await AsyncStorage.setItem(initializedKey, 'true');
          if (workspaceId !== DEFAULT_WORKSPACE_ID && isSharedWorkspaceId(workspaceId)) {
            await syncSharedWishesToSupabase(workspaceId, snapshot);
          }
        }
      }

      await AsyncStorage.setItem(ACTIVE_WORKSPACE_KEY, workspaceId);
      setActiveWorkspaceId(workspaceId);
      await queryClient.invalidateQueries({ queryKey: ['wishes', workspaceId] });
      console.log('[WishProvider] Switched workspace:', workspaceId);
    },
    [queryClient],
  );

  useEffect(() => {
    if (!workspaceReady || !currentUrl || handledUrlRef.current === currentUrl) {
      return;
    }

    const parsed = Linking.parse(currentUrl);
    const params = parsed.queryParams ?? {};
    const workspaceParam = params.workspaceId;
    const snapshotParam = params.snapshot;
    const parsedWorkspaceId =
      typeof workspaceParam === 'string' ? workspaceParam : Array.isArray(workspaceParam) ? workspaceParam[0] : null;
    const snapshotRaw =
      typeof snapshotParam === 'string' ? snapshotParam : Array.isArray(snapshotParam) ? snapshotParam[0] : null;
    const snapshot = parseSnapshot(snapshotRaw);

    if (!parsedWorkspaceId) {
      handledUrlRef.current = currentUrl;
      return;
    }

    handledUrlRef.current = currentUrl;
    switchWorkspace(parsedWorkspaceId, { snapshot }).catch((error: unknown) => {
      console.warn('[WishProvider] Failed to switch workspace from link', error);
    });
  }, [currentUrl, workspaceReady, switchWorkspace]);

  useEffect(() => {
    if (!workspaceReady || activeWorkspaceId === DEFAULT_WORKSPACE_ID || !isSharedWorkspaceId(activeWorkspaceId)) {
      return;
    }

    const channel = supabase
      .channel(`wishes-live-${activeWorkspaceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wishes' }, (payload) => {
        const raw =
          payload.new && Object.keys(payload.new as Record<string, unknown>).length > 0
            ? (payload.new as Record<string, unknown>)
            : (payload.old as Record<string, unknown> | undefined);
        const pairId =
          typeof raw?.pair_id === 'string'
            ? raw.pair_id
            : typeof raw?.pairId === 'string'
              ? raw.pairId
              : null;

        if (pairId === activeWorkspaceId) {
          queryClient.invalidateQueries({ queryKey: ['wishes', activeWorkspaceId] });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeWorkspaceId, queryClient, workspaceReady]);

  const shouldAutoRefreshSharedWishes =
    workspaceReady && activeWorkspaceId !== DEFAULT_WORKSPACE_ID && isSharedWorkspaceId(activeWorkspaceId);

  const wishesQuery = useQuery({
    queryKey: ['wishes', activeWorkspaceId],
    enabled: workspaceReady,
    refetchInterval: shouldAutoRefreshSharedWishes ? 10000 : false,
    refetchIntervalInBackground: false,
    refetchOnReconnect: true,
    queryFn: async () => {
      const initializedKey = getInitializedKey(activeWorkspaceId);
      const wishesKey = getWishesKey(activeWorkspaceId);
      const storedRaw = await AsyncStorage.getItem(wishesKey);
      const storedWishes = parseStoredWishes(storedRaw);

      if (activeWorkspaceId !== DEFAULT_WORKSPACE_ID && isSharedWorkspaceId(activeWorkspaceId)) {
        const remoteWishes = await fetchSharedWishesFromSupabase(activeWorkspaceId);

        if (remoteWishes) {
          if (remoteWishes.length > 0 || storedWishes.length === 0) {
            await AsyncStorage.setItem(wishesKey, JSON.stringify(remoteWishes));
            await AsyncStorage.setItem(initializedKey, 'true');
            return remoteWishes;
          }

          await syncSharedWishesToSupabase(activeWorkspaceId, storedWishes);
          await AsyncStorage.setItem(initializedKey, 'true');
          return storedWishes;
        }
      }

      const initialized = await AsyncStorage.getItem(initializedKey);

      if (!initialized) {
        let initialWishes: Wish[] = [];

        if (activeWorkspaceId === DEFAULT_WORKSPACE_ID) {
          const legacyWishesRaw = await AsyncStorage.getItem(LEGACY_WISHES_KEY);
          const legacyInitialized = await AsyncStorage.getItem(LEGACY_INITIALIZED_KEY);

          if (legacyWishesRaw && legacyInitialized) {
            try {
              const legacyWishes = JSON.parse(legacyWishesRaw) as Wish[];
              if (Array.isArray(legacyWishes)) {
                initialWishes = legacyWishes.map((wish) => ({ ...wish, pairId: DEFAULT_WORKSPACE_ID }));
              }
            } catch {
              initialWishes = [];
            }
          }

          if (initialWishes.length === 0) {
            initialWishes = SAMPLE_WISHES.map((wish) => ({ ...wish, pairId: DEFAULT_WORKSPACE_ID }));
          }
        }

        await AsyncStorage.setItem(wishesKey, JSON.stringify(initialWishes));
        await AsyncStorage.setItem(initializedKey, 'true');
        console.log('[WishProvider] Initialized workspace:', activeWorkspaceId);
        return initialWishes;
      }

      return storedWishes;
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
    if (workspaceReady && wishesQuery.data) {
      setWishes(wishesQuery.data);
    }
  }, [wishesQuery.data, workspaceReady]);

  useEffect(() => {
    if (notifQuery.data) {
      setNotificationSettings(notifQuery.data);
    }
  }, [notifQuery.data]);

  const { mutate: persistWishesMutate } = useMutation({
    mutationFn: async ({ workspaceId, updated }: { workspaceId: string; updated: Wish[] }) => {
      await AsyncStorage.setItem(getWishesKey(workspaceId), JSON.stringify(updated));
      if (workspaceId !== DEFAULT_WORKSPACE_ID && isSharedWorkspaceId(workspaceId)) {
        await syncSharedWishesToSupabase(workspaceId, updated);
      }
      return { workspaceId, updated };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['wishes', data.workspaceId], data.updated);
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
        pairId: activeWorkspaceId,
        createdBy: 'guest',
        createdAt: now,
        updatedAt: now,
      };
      const updated = [newWish, ...wishes];
      setWishes(updated);
      persistWishesMutate({ workspaceId: activeWorkspaceId, updated });
      console.log('[WishProvider] Added wish:', newWish.title);
    },
    [activeWorkspaceId, wishes, persistWishesMutate],
  );

  const updateWish = useCallback(
    (id: string, updates: Partial<Wish>) => {
      const updated = wishes.map((w) =>
        w.id === id ? { ...w, ...updates, updatedAt: new Date().toISOString() } : w,
      );
      setWishes(updated);
      persistWishesMutate({ workspaceId: activeWorkspaceId, updated });
      console.log('[WishProvider] Updated wish:', id);
    },
    [activeWorkspaceId, wishes, persistWishesMutate],
  );

  const deleteWish = useCallback(
    (id: string) => {
      const updated = wishes.filter((w) => w.id !== id);
      setWishes(updated);
      persistWishesMutate({ workspaceId: activeWorkspaceId, updated });
      console.log('[WishProvider] Deleted wish:', id);
    },
    [activeWorkspaceId, wishes, persistWishesMutate],
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

  const isSharedWorkspace = activeWorkspaceId !== DEFAULT_WORKSPACE_ID;

  const createShareLink = useCallback(async () => {
    const snapshot = JSON.stringify(wishes);
    const link = Linking.createURL('/', {
      queryParams: {
        workspaceId: activeWorkspaceId,
        snapshot,
      },
    });
    return link;
  }, [activeWorkspaceId, wishes]);

  const createWorkspace = useCallback(async () => {
    const workspaceId = generateWorkspaceId();
    await switchWorkspace(workspaceId);
    return workspaceId;
  }, [switchWorkspace]);

  const resetWorkspace = useCallback(async () => {
    await switchWorkspace(DEFAULT_WORKSPACE_ID);
  }, [switchWorkspace]);

  return {
    wishes,
    notificationSettings,
    activeWorkspaceId,
    isSharedWorkspace,
    stats,
    nextCandidates,
    isLoading: wishesQuery.isLoading || !workspaceReady,
    addWish,
    updateWish,
    deleteWish,
    toggleWishStatus,
    createWorkspace,
    createShareLink,
    resetWorkspace,
    switchWorkspace,
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
