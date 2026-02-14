import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';

import {
    registerForPushNotificationsAsync,
    scheduleWishNotifications,
} from '@/services/notificationService';
import { NotificationSettings, Wish } from '@/types/wish';

/**
 * プッシュ通知の初期化・権限管理・スケジューリングを行うフック
 *
 * - アプリ起動時に通知権限をリクエストし、Expo Push Token を取得
 * - wishes / notificationSettings が変化したらローカル通知を再スケジュール
 * - 通知タップ時のレスポンスリスナーを登録
 */
export function useNotifications(
  wishes: Wish[],
  notificationSettings: NotificationSettings,
) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] =
    useState<Notifications.Notification | null>(null);

  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  // ─── 初期化: Push Token 取得 & リスナー登録 ───
  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        setExpoPushToken(token);
      }
    });

    // 通知を受信したとき（フォアグラウンド）
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notif) => {
        setNotification(notif);
        console.log('[useNotifications] Received notification:', notif.request.content.body);
      });

    // 通知をタップしたとき
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        console.log('[useNotifications] Notification tapped, data:', data);
        // wishId が含まれていれば、該当 Wish への遷移などに利用可能
      });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  // ─── wishes / 通知設定が変わったら再スケジュール ───
  useEffect(() => {
    scheduleWishNotifications(wishes, notificationSettings).catch((err) => {
      console.warn('[useNotifications] Failed to schedule notifications:', err);
    });
  }, [wishes, notificationSettings]);

  return {
    expoPushToken,
    notification,
  };
}
