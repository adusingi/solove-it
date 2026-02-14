import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { NUDGE_MESSAGES } from '@/constants/categories';
import { AnnoyanceLevel, NotificationSettings, TimeWindow, Wish } from '@/types/wish';

// ─── 通知チャンネル設定（Android） ───
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── 時間帯マッピング ───
const TIME_WINDOW_HOURS: Record<TimeWindow, number> = {
  morning: 8,
  noon: 12,
  night: 20,
};

// ─── 鬱陶しさレベルごとのスケジュール ───
// レベル0: 週1回, レベル1: 週2回, レベル2: 毎日, レベル3: 1日2回
function getScheduleForLevel(
  level: AnnoyanceLevel,
  timeWindow: TimeWindow,
): Notifications.NotificationTriggerInput[] {
  const hour = TIME_WINDOW_HOURS[timeWindow];

  switch (level) {
    case 0:
      // 週1回（日曜日）
      return [
        {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: 1, // Sunday
          hour,
          minute: 0,
        },
      ];
    case 1:
      // 週2回（水曜と土曜）
      return [
        {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: 4, // Wednesday
          hour,
          minute: 0,
        },
        {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: 7, // Saturday
          hour,
          minute: 0,
        },
      ];
    case 2:
      // 毎日
      return [
        {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute: 0,
        },
      ];
    case 3:
      // 3分に1回（鬼モード 👹）
      return [
        {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 180,
          repeats: true,
        },
      ];
    default:
      return [];
  }
}

// ─── 通知メッセージをランダムに選択 ───
function getRandomNudgeMessage(level: AnnoyanceLevel, title: string): string {
  const messages = NUDGE_MESSAGES[level] ?? NUDGE_MESSAGES[0];
  const randomIndex = Math.floor(Math.random() * messages.length);
  return messages[randomIndex].replace('{title}', title);
}

// ─── Push Token 取得 ───
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Android 通知チャンネルの設定
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'やりたいことリマインド',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B8A',
      sound: 'default',
    });
  }

  // 実機チェック（シミュレータでは動かない）
  if (!Device.isDevice) {
    console.log('[Notification] Push notifications require a physical device');
    return null;
  }

  // 権限の確認・リクエスト
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Notification] Permission not granted');
    return null;
  }

  // Expo Push Token の取得
  // ※ リモート Push 通知には EAS projectId が必要。
  //    ローカル通知のスケジューリングは projectId なしでも動作する。
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.warn(
        '[Notification] No EAS projectId found. Remote push tokens are unavailable.\n' +
          '  → ローカル通知は動作します。リモート Push を有効にするには `eas init` を実行してください。',
      );
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    console.log('[Notification] Push token:', tokenData.data);
    return tokenData.data;
  } catch (error) {
    console.warn('[Notification] Failed to get push token (local notifications still work):', error);
    return null;
  }
}

// ─── ローカル通知のスケジュール ───
export async function scheduleWishNotifications(
  wishes: Wish[],
  settings: NotificationSettings,
): Promise<void> {
  // 既存のスケジュール済み通知をすべてキャンセル
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (!settings.enabled) {
    console.log('[Notification] Notifications disabled, cleared all schedules');
    return;
  }

  // 対象 Wish をフィルタリング
  let targetWishes = wishes.filter((w) => w.status === 'todo');

  if (settings.highPriorityOnly) {
    targetWishes = targetWishes.filter((w) => w.priority === 'high');
  }

  if (targetWishes.length === 0) {
    console.log('[Notification] No wishes to notify about');
    return;
  }

  // スケジュールの取得
  const triggers = getScheduleForLevel(settings.annoyanceLevel, settings.timeWindow);

  // 各トリガーに対してランダムに Wish を選んで通知をスケジュール
  for (const trigger of triggers) {
    const randomWish = targetWishes[Math.floor(Math.random() * targetWishes.length)];
    const message = getRandomNudgeMessage(settings.annoyanceLevel, randomWish.title);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'やりたいことリスト 💌',
        body: message,
        sound: 'default',
        data: { wishId: randomWish.id },
      },
      trigger,
    });
  }

  console.log(
    `[Notification] Scheduled ${triggers.length} notification(s) at level ${settings.annoyanceLevel}`,
  );
}

// ─── テスト通知を即時送信 ───
export async function sendTestNotification(
  annoyanceLevel: AnnoyanceLevel,
  title: string,
): Promise<void> {
  const message = getRandomNudgeMessage(annoyanceLevel, title);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'やりたいことリスト 💌',
      body: message,
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
    },
  });

  console.log('[Notification] Test notification scheduled');
}

// ─── 全スケジュール済み通知をキャンセル ───
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('[Notification] All scheduled notifications cancelled');
}

// ─── スケジュール済み通知の一覧取得 ───
export async function getScheduledNotifications() {
  return Notifications.getAllScheduledNotificationsAsync();
}
