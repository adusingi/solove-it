import * as Haptics from 'expo-haptics';
import { Bell, BellOff, Clock, Shield, Volume2 } from 'lucide-react-native';
import React, { useCallback } from 'react';
import {
  Pressable,
  ScrollView,
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
  const { notificationSettings, updateNotificationSettings, nextCandidates } = useWishes();

  const sampleTitle = nextCandidates[0]?.title ?? 'やりたいこと';
  const sampleMessages = NUDGE_MESSAGES[notificationSettings.annoyanceLevel] ?? NUDGE_MESSAGES[0];
  const sampleMessage = sampleMessages[0].replace('{title}', sampleTitle);

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
