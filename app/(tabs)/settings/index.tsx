import * as Haptics from 'expo-haptics';
import { Bell, BellOff, Clock, Link2, RotateCcw, Shield, Users, Volume2 } from 'lucide-react-native';
import React, { useCallback } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/colors';
import { ANNOYANCE_LABELS, NUDGE_MESSAGES } from '@/constants/categories';
import { useWishes } from '@/providers/WishProvider';
import { AnnoyanceLevel, TimeWindow } from '@/types/wish';

const TIME_WINDOWS: { key: TimeWindow; label: string; time: string; emoji: string }[] = [
  { key: 'morning', label: '朝', time: '8:00', emoji: '🌅' },
  { key: 'noon', label: '昼', time: '12:00', emoji: '☀️' },
  { key: 'night', label: '夜', time: '20:00', emoji: '🌙' },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const {
    notificationSettings,
    updateNotificationSettings,
    nextCandidates,
    activeWorkspaceId,
    isSharedWorkspace,
    createShareLink,
    createWorkspace,
    resetWorkspace,
  } = useWishes();

  const sampleTitle = nextCandidates[0]?.title ?? 'やりたいこと';
  const sampleMessages = NUDGE_MESSAGES[notificationSettings.annoyanceLevel] ?? NUDGE_MESSAGES[0];
  const sampleMessage = sampleMessages[0].replace('{title}', sampleTitle);
  const workspaceLabel =
    activeWorkspaceId.length > 20 ? `${activeWorkspaceId.slice(0, 20)}...` : activeWorkspaceId;

  const handleToggle = useCallback(
    (value: boolean) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      updateNotificationSettings({ enabled: value });
    },
    [updateNotificationSettings],
  );

  const handleAnnoyanceChange = useCallback(
    (level: AnnoyanceLevel) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      updateNotificationSettings({ annoyanceLevel: level });
    },
    [updateNotificationSettings],
  );

  const handleTimeChange = useCallback(
    (tw: TimeWindow) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      updateNotificationSettings({ timeWindow: tw });
    },
    [updateNotificationSettings],
  );

  const handleHighPriorityToggle = useCallback(
    (value: boolean) => {
      updateNotificationSettings({ highPriorityOnly: value });
    },
    [updateNotificationSettings],
  );

  const handleShareLink = useCallback(async () => {
    try {
      const link = await createShareLink();
      await Share.share({
        title: '共有リストリンク',
        message: `やりたいことリストを共有します\n${link}`,
      });
    } catch {
      Alert.alert('共有に失敗しました', '時間をおいてもう一度お試しください');
    }
  }, [createShareLink]);

  const handleCreateWorkspace = useCallback(async () => {
    try {
      const newWorkspaceId = await createWorkspace();
      Alert.alert('新しい共有リストを作成しました', `共有ID: ${newWorkspaceId}`);
    } catch {
      Alert.alert('作成に失敗しました', '時間をおいてもう一度お試しください');
    }
  }, [createWorkspace]);

  const handleResetWorkspace = useCallback(async () => {
    try {
      await resetWorkspace();
      Alert.alert('切り替えました', '個人リストに戻りました');
    } catch {
      Alert.alert('切り替えに失敗しました', '時間をおいてもう一度お試しください');
    }
  }, [resetWorkspace]);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>通知設定</Text>
        <Text style={styles.headerSub}>「鬱陶しい通知」で忘れない</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                {notificationSettings.enabled ? (
                  <Bell size={22} color={Colors.primary} />
                ) : (
                  <BellOff size={22} color={Colors.textTertiary} />
                )}
                <View>
                  <Text style={styles.toggleLabel}>通知</Text>
                  <Text style={styles.toggleSub}>
                    {notificationSettings.enabled ? 'ON — リマインドします' : 'OFF — 静かにしてます'}
                  </Text>
                </View>
              </View>
              <Switch
                value={notificationSettings.enabled}
                onValueChange={handleToggle}
                trackColor={{ false: Colors.border, true: Colors.primary + '60' }}
                thumbColor={notificationSettings.enabled ? Colors.primary : Colors.textTertiary}
                testID="notification-toggle"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>共有リスト</Text>
          <View style={styles.card}>
            <View style={styles.workspaceHeader}>
              <Users size={20} color={Colors.primary} />
              <View style={styles.workspaceMeta}>
                <Text style={styles.toggleLabel}>
                  {isSharedWorkspace ? '共有モード' : '個人モード'}
                </Text>
                <Text style={styles.workspaceId}>ID: {workspaceLabel}</Text>
              </View>
            </View>

            <Pressable onPress={handleShareLink} style={styles.primaryAction}>
              <Link2 size={16} color="#fff" />
              <Text style={styles.primaryActionText}>共有リンクを発行</Text>
            </Pressable>

            <Pressable onPress={handleCreateWorkspace} style={styles.secondaryAction}>
              <Text style={styles.secondaryActionText}>新しい共有リストを作る</Text>
            </Pressable>

            {isSharedWorkspace && (
              <Pressable onPress={handleResetWorkspace} style={styles.secondaryAction}>
                <RotateCcw size={14} color={Colors.textSecondary} />
                <Text style={styles.secondaryActionText}>個人リストに戻る</Text>
              </Pressable>
            )}
          </View>
        </View>

        {notificationSettings.enabled && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                <Volume2 size={14} color={Colors.textSecondary} /> 鬱陶しさレベル
              </Text>
              <View style={styles.annoyanceGrid}>
                {([0, 1, 2, 3] as AnnoyanceLevel[]).map((level) => {
                  const info = ANNOYANCE_LABELS[level];
                  const isSelected = notificationSettings.annoyanceLevel === level;
                  return (
                    <Pressable
                      key={level}
                      onPress={() => handleAnnoyanceChange(level)}
                      style={[styles.annoyanceCard, isSelected && styles.annoyanceCardSelected]}
                    >
                      <Text style={styles.annoyanceEmoji}>{info.emoji}</Text>
                      <Text style={[styles.annoyanceLabel, isSelected && styles.annoyanceLabelSelected]}>
                        {info.label}
                      </Text>
                      <Text style={[styles.annoyanceDesc, isSelected && styles.annoyanceDescSelected]}>
                        {info.description}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                <Clock size={14} color={Colors.textSecondary} /> 通知時間帯
              </Text>
              <View style={styles.timeGrid}>
                {TIME_WINDOWS.map((tw) => {
                  const isSelected = notificationSettings.timeWindow === tw.key;
                  return (
                    <Pressable
                      key={tw.key}
                      onPress={() => handleTimeChange(tw.key)}
                      style={[styles.timeCard, isSelected && styles.timeCardSelected]}
                    >
                      <Text style={styles.timeEmoji}>{tw.emoji}</Text>
                      <Text style={[styles.timeLabel, isSelected && styles.timeLabelSelected]}>
                        {tw.label}
                      </Text>
                      <Text style={[styles.timeDesc, isSelected && styles.timeDescSelected]}>
                        {tw.time}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.card}>
                <View style={styles.toggleRow}>
                  <View style={styles.toggleLeft}>
                    <Shield size={20} color={Colors.accent} />
                    <View>
                      <Text style={styles.toggleLabel}>優先度「高」のみ通知</Text>
                      <Text style={styles.toggleSub}>重要なものだけリマインド</Text>
                    </View>
                  </View>
                  <Switch
                    value={notificationSettings.highPriorityOnly}
                    onValueChange={handleHighPriorityToggle}
                    trackColor={{ false: Colors.border, true: Colors.accent + '60' }}
                    thumbColor={notificationSettings.highPriorityOnly ? Colors.accent : Colors.textTertiary}
                  />
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>通知プレビュー</Text>
              <View style={styles.previewCard}>
                <View style={styles.previewHeader}>
                  <View style={styles.previewIcon}>
                    <Bell size={14} color={Colors.primary} />
                  </View>
                  <Text style={styles.previewApp}>やりたいことリスト</Text>
                  <Text style={styles.previewTime}>たった今</Text>
                </View>
                <Text style={styles.previewText}>{sampleMessage}</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
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
    paddingBottom: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
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
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    ...Colors.shadow.small,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  toggleSub: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  workspaceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  workspaceMeta: {
    flex: 1,
  },
  workspaceId: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  primaryAction: {
    marginTop: 14,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  secondaryAction: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.background,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  annoyanceGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  annoyanceCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...Colors.shadow.small,
  },
  annoyanceCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  annoyanceEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  annoyanceLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  annoyanceLabelSelected: {
    color: Colors.primary,
  },
  annoyanceDesc: {
    fontSize: 10,
    color: Colors.textTertiary,
  },
  annoyanceDescSelected: {
    color: Colors.primaryDark,
  },
  timeGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  timeCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...Colors.shadow.small,
  },
  timeCardSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentLight,
  },
  timeEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  timeLabelSelected: {
    color: Colors.accent,
  },
  timeDesc: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  timeDescSelected: {
    color: Colors.accent,
  },
  previewCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    ...Colors.shadow.medium,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  previewApp: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    flex: 1,
  },
  previewTime: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  previewText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
    fontWeight: '500' as const,
  },
});
