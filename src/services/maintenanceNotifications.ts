import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const CHANNEL_ID = 'notein-maintenance-reminders';
const MONTHLY_ID = 'notein.maintenance.odo.monthly';
const FOLLOW_UP_ID = 'notein.maintenance.odo.follow-up';
const CHECK_IN_ID = 'notein.maintenance.odo.check-in';

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Nhắc bảo dưỡng xe',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
    enableVibrate: true,
  });
}

async function replace(identifier: string, trigger: Notifications.NotificationTriggerInput): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: 'Cập nhật ODO xe',
      body: identifier === FOLLOW_UP_ID
        ? 'Bạn chưa nhập ODO tháng này. Mở NoteIn để cập nhật bảo dưỡng.'
        : 'Nhập ODO hiện tại để NoteIn kiểm tra lịch bảo dưỡng xe.',
      data: { type: 'maintenance-odo' },
      sound: 'default',
    },
    trigger,
  });
}

export async function scheduleMonthlyOdoReminders(): Promise<void> {
  const permissions = await Notifications.getPermissionsAsync();
  const permission = permissions.granted ? permissions : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return;
  await ensureChannel();
  await replace(MONTHLY_ID, {
    type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
    day: 1,
    hour: 9,
    minute: 0,
    channelId: CHANNEL_ID,
  });
  await replace(FOLLOW_UP_ID, {
    type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
    day: 8,
    hour: 9,
    minute: 0,
    channelId: CHANNEL_ID,
  });
  await replace(CHECK_IN_ID, {
    type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
    weekday: 2,
    hour: 9,
    minute: 0,
    channelId: CHANNEL_ID,
  });
}
