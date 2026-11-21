import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { format } from 'date-fns';
import { NativeModules, Platform } from 'react-native';
import { buildTimeline, getCurrentState } from '../engine/schedule';
import { type Language, translations } from '../i18n/translations';
import type { DailyTemplate, EventItem } from '../types/schedule';
import { buildLockScreenPayload } from './lockScreenSync';

const NOTIFICATION_ID = 'notein.android.current-schedule';
const CHANNEL_ID = 'notein-current-schedule';
let channelCreated = false;
let notificationPosted = false;
let notificationObserved = false;
let syncInFlight: Promise<AndroidScheduleNotificationSyncStatus> | undefined;

export type AndroidScheduleNotificationSyncStatus =
  | 'active'
  | 'pending'
  | 'dismissed';

if (Platform.OS === 'android') {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const isCurrentSchedule =
        notification.request.identifier === NOTIFICATION_ID;
      return {
        shouldShowBanner: false,
        shouldShowList: isCurrentSchedule,
        shouldPlaySound: false,
        shouldSetBadge: false,
      };
    },
  });
}

function formatTime(minutes: number): string {
  const hour = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

async function ensureNotificationChannel(language: Language): Promise<void> {
  if (channelCreated) return;
  const t = translations[language];
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: t.androidScheduleNotificationChannel,
    importance: AndroidImportance.LOW,
    sound: null,
    enableVibrate: false,
    vibrationPattern: [],
    showBadge: false,
  });
  channelCreated = true;
}

async function postCurrentSchedule(
  dailies: DailyTemplate[],
  events: EventItem[],
  completions: Record<string, true>,
  now: Date,
  language: Language,
): Promise<void> {
  if (NativeModules.NoteInLockScreen?.startOrUpdateLiveActivity) {
    try {
      await Notifications.dismissNotificationAsync(NOTIFICATION_ID).catch(() => {});
    } catch {
      // Ignore
    }
    const payload = buildLockScreenPayload(
      dailies,
      events,
      completions,
      now,
      language,
    );
    await NativeModules.NoteInLockScreen.startOrUpdateLiveActivity(
      JSON.stringify(payload),
    );
    return;
  }

  await ensureNotificationChannel(language);
  const t = translations[language];
  const timeline = buildTimeline(
    dailies,
    events,
    completions,
    format(now, 'yyyy-MM-dd'),
  );
  const currentState = getCurrentState(
    timeline,
    now.getHours() * 60 + now.getMinutes(),
  );

  let title: string = t.noScheduleToday;
  let body: string = t.noScheduleToday;

  if (currentState.kind === 'current') {
    title = currentState.item.title;
    body = `${formatTime(currentState.item.startMin)}–${formatTime(currentState.item.endMin)}`;
  } else if (currentState.kind === 'upcoming') {
    title = currentState.item.title;
    body = `${formatTime(currentState.item.startMin)}–${formatTime(currentState.item.endMin)}`;
  } else if (currentState.kind === 'finished') {
    title = t.finishedToday;
    body = t.finishedToday;
  }

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_ID,
    content: {
      title,
      body,
      data: { type: 'current-schedule' },
      priority: Notifications.AndroidNotificationPriority.LOW,
      sticky: true,
      autoDismiss: false,
      sound: false,
    },
    trigger: { channelId: CHANNEL_ID },
  });
}

export async function isAndroidScheduleNotificationActive(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (NativeModules.NoteInLockScreen?.isLiveActivityActive) {
    const active = Boolean(
      await NativeModules.NoteInLockScreen.isLiveActivityActive(),
    );
    if (active) {
      notificationPosted = true;
      notificationObserved = true;
    }
    return active;
  }
  const presented = await Notifications.getPresentedNotificationsAsync();
  const active = presented.some(
    (notification) => notification.request.identifier === NOTIFICATION_ID,
  );
  if (active) {
    notificationPosted = true;
    notificationObserved = true;
  }
  return active;
}

export async function enableAndroidScheduleNotification(
  dailies: DailyTemplate[],
  events: EventItem[],
  completions: Record<string, true>,
  now: Date,
  language: Language,
): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  await ensureNotificationChannel(language);
  const currentPermission = await Notifications.getPermissionsAsync();
  const permission =
    currentPermission.status === 'granted'
      ? currentPermission
      : await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') return false;

  await postCurrentSchedule(dailies, events, completions, now, language);
  notificationPosted = true;
  notificationObserved = false;
  return true;
}

export async function disableAndroidScheduleNotification(): Promise<void> {
  if (Platform.OS !== 'android') return;

  if (NativeModules.NoteInLockScreen?.stopLiveActivity) {
    await NativeModules.NoteInLockScreen.stopLiveActivity();
  }
  try {
    await Notifications.dismissNotificationAsync(NOTIFICATION_ID);
  } catch {
    // Ignore
  }
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  if (scheduled.some((notification) => notification.identifier === NOTIFICATION_ID)) {
    await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID);
  }
  notificationPosted = false;
  notificationObserved = false;
}

export async function syncAndroidScheduleNotification(
  dailies: DailyTemplate[],
  events: EventItem[],
  completions: Record<string, true>,
  now: Date,
  language: Language,
): Promise<AndroidScheduleNotificationSyncStatus> {
  if (Platform.OS !== 'android') return 'dismissed';
  if (syncInFlight) return syncInFlight;

  const sync = (async (): Promise<AndroidScheduleNotificationSyncStatus> => {
    const active = await isAndroidScheduleNotificationActive();
    if (active) {
      await postCurrentSchedule(dailies, events, completions, now, language);
      return 'active';
    }

    if (notificationObserved || !notificationPosted) {
      notificationPosted = false;
      return 'dismissed';
    }

    await postCurrentSchedule(dailies, events, completions, now, language);
    return 'pending';
  })();
  syncInFlight = sync;

  try {
    return await sync;
  } finally {
    if (syncInFlight === sync) syncInFlight = undefined;
  }
}
