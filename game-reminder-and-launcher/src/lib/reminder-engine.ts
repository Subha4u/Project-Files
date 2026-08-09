/**
 * GameReminder - Reminder Engine
 * 
 * Handles:
 * - Service worker registration
 * - Notification scheduling (via SW for background support)
 * - Recurring reminder calculations
 * - In-app alarm alerts
 * - Duplicate prevention
 */

import { addDays, addWeeks, setHours, setMinutes, getDay, nextDay, isBefore } from 'date-fns';

// ── Types ─────────────────────────────────────

export interface ReminderData {
  id: string;
  title: string;
  scheduledDateTime: string;
  repeatRule: string;
  customRepeatDays?: string | null;
  notificationType: string;
  enabled: boolean;
  game?: {
    id: string;
    name: string;
    packageId: string;
    iconUrl: string;
  } | null;
  category?: {
    name: string;
    icon: string;
  } | null;
}

export type NotificationPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

export interface AlarmData {
  reminderId: string;
  title: string;
  gameName: string;
  gameIcon?: string;
  gamePackageId?: string;
  scheduledTime: Date;
}

type AlarmCallback = (alarm: AlarmData) => void;

// ── State ─────────────────────────────────────

let swRegistration: ServiceWorkerRegistration | null = null;
let isInitialized = false;
let alarmCallback: AlarmCallback | null = null;

// Track scheduled notifications to prevent duplicates
const scheduledNotifications = new Map<string, number>(); // notificationId -> timeoutId
const triggeredNotifications = new Set<string>();

// ── Initialization ────────────────────────────

export async function initReminderEngine(): Promise<boolean> {
  if (isInitialized) return true;

  if (typeof window === 'undefined') return false;

  // Register service worker
  if ('serviceWorker' in navigator) {
    try {
      swRegistration = await navigator.serviceWorker.register('/sw.js');
      console.log('[Engine] Service worker registered');

      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', handleSWMessage);

      isInitialized = true;
      return true;
    } catch (err) {
      console.error('[Engine] Service worker registration failed:', err);
      return false;
    }
  }

  console.warn('[Engine] Service workers not supported');
  return false;
}

// ── Notification Permission ───────────────────

export function getNotificationPermission(): NotificationPermissionStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionStatus;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission as NotificationPermissionStatus;
  } catch {
    return 'denied';
  }
}

// ── Schedule Notification ─────────────────────

export async function scheduleReminder(reminder: ReminderData): Promise<string | null> {
  if (!reminder.enabled) return null;

  const scheduledTime = new Date(reminder.scheduledDateTime).getTime();
  const now = Date.now();

  // Don't schedule if already past
  if (scheduledTime <= now) {
    console.log('[Engine] Reminder already past, not scheduling:', reminder.id);
    return null;
  }

  // Generate unique notification ID
  const notificationId = `reminder-${reminder.id}-${scheduledTime}`;

  // Cancel any existing notification for this reminder
  await cancelReminderNotification(reminder.id);

  // Prepare notification payload
  const payload = {
    notificationId,
    reminderId: reminder.id,
    title: `🎮 ${reminder.game?.name || 'Game'} Reminder`,
    body: reminder.title,
    gameId: reminder.game?.id,
    gameName: reminder.game?.name || 'Game',
    gamePackageId: reminder.game?.packageId,
    gameIcon: reminder.game?.iconUrl || '/favicon.svg',
    notificationType: reminder.notificationType,
    scheduledTime,
  };

  // If service worker is ready, use it
  if (swRegistration?.active) {
    swRegistration.active.postMessage({
      type: 'SCHEDULE_NOTIFICATION',
      payload,
    });
    console.log('[Engine] Scheduled via SW:', notificationId);
  } else {
    // Fallback: use setTimeout directly (won't work if app closes)
    scheduleLocalFallback(payload);
    console.log('[Engine] Scheduled via fallback:', notificationId);
  }

  // Track the scheduled notification
  scheduledNotifications.set(reminder.id, scheduledTime);

  // Update the server with the notification ID
  try {
    await fetch(`/api/reminders/${reminder.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lastNotificationId: notificationId }),
    });
  } catch (err) {
    console.error('[Engine] Failed to update notification ID:', err);
  }

  return notificationId;
}

function scheduleLocalFallback(payload: {
  notificationId: string;
  reminderId: string;
  title: string;
  body: string;
  gameId?: string;
  gameName: string;
  gamePackageId?: string;
  gameIcon: string;
  notificationType: string;
  scheduledTime: number;
}) {
  const delay = payload.scheduledTime - Date.now();

  if (delay <= 0) {
    triggerNotification(payload);
    return;
  }

  // Cancel existing timeout if any
  if (scheduledNotifications.has(payload.reminderId)) {
    const existingTimeout = scheduledNotifications.get(payload.reminderId);
    if (typeof existingTimeout === 'number' && existingTimeout > Date.now()) {
      // It's a timeout ID stored during fallback
    }
  }

  const timeoutId = window.setTimeout(() => {
    triggerNotification(payload);
  }, delay);

  // Store timeout ID (we'll use reminderId as key)
  scheduledNotifications.set(payload.reminderId, timeoutId);
}

async function triggerNotification(payload: {
  notificationId: string;
  reminderId: string;
  title: string;
  body: string;
  gameName: string;
  gamePackageId?: string;
  gameIcon: string;
  notificationType: string;
  scheduledTime: number;
}) {
  // Prevent duplicate triggers
  if (triggeredNotifications.has(payload.notificationId)) {
    console.log('[Engine] Notification already triggered:', payload.notificationId);
    return;
  }
  triggeredNotifications.add(payload.notificationId);

  const permission = getNotificationPermission();
  const isAlarm = payload.notificationType === 'alarm';

  // If alarm type and app is in foreground, show in-app alarm
  if (isAlarm && alarmCallback && document.visibilityState === 'visible') {
    alarmCallback({
      reminderId: payload.reminderId,
      title: payload.body, // The actual reminder title
      gameName: payload.gameName,
      gameIcon: payload.gameIcon,
      gamePackageId: payload.gamePackageId,
      scheduledTime: new Date(payload.scheduledTime),
    });
  }

  // Also show native notification if permitted
  if (permission === 'granted') {
    try {
      const notification = new Notification(payload.title, {
        body: payload.body,
        icon: payload.gameIcon,
        tag: payload.notificationId,
        requireInteraction: isAlarm,
        silent: false,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        // Navigate to reminder detail
        window.dispatchEvent(new CustomEvent('reminder-clicked', {
          detail: { reminderId: payload.reminderId },
        }));
      };
    } catch (err) {
      console.error('[Engine] Failed to show notification:', err);
    }
  }

  // Mark as triggered on server
  try {
    await fetch(`/api/reminders/${payload.reminderId}/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[Engine] Failed to mark reminder as triggered:', err);
  }
}

// ── Cancel Notification ───────────────────────

export async function cancelReminderNotification(reminderId: string): Promise<void> {
  // Cancel via service worker
  if (swRegistration?.active) {
    swRegistration.active.postMessage({
      type: 'CANCEL_NOTIFICATION',
      payload: { notificationId: `reminder-${reminderId}` },
    });
  }

  // Cancel local fallback timeout
  const timeoutId = scheduledNotifications.get(reminderId);
  if (timeoutId) {
    clearTimeout(timeoutId);
    scheduledNotifications.delete(reminderId);
  }

  console.log('[Engine] Cancelled notification for:', reminderId);
}

// ── Recurring Reminder Logic ──────────────────

export function calculateNextOccurrence(
  currentDateTime: Date,
  repeatRule: string,
  customRepeatDays?: string | null
): Date | null {
  const now = new Date();
  let nextDate: Date;

  switch (repeatRule) {
    case 'none':
      return null;

    case 'daily':
      // Add 1 day to current, ensuring it's in the future
      nextDate = addDays(currentDateTime, 1);
      while (isBefore(nextDate, now)) {
        nextDate = addDays(nextDate, 1);
      }
      return nextDate;

    case 'weekly':
      // Add 1 week to current, ensuring it's in the future
      nextDate = addWeeks(currentDateTime, 1);
      while (isBefore(nextDate, now)) {
        nextDate = addWeeks(nextDate, 1);
      }
      return nextDate;

    case 'custom':
      if (!customRepeatDays) return null;

      // Parse custom days (0-6, where 0 = Sunday)
      const days = customRepeatDays.split(',').map(Number).filter(d => d >= 0 && d <= 6);
      if (days.length === 0) return null;

      const currentHour = currentDateTime.getHours();
      const currentMinute = currentDateTime.getMinutes();
      const today = getDay(now);

      // Find the next occurrence
      for (let i = 1; i <= 7; i++) {
        const targetDay = (today + i) % 7;
        if (days.includes(targetDay)) {
          // Get next occurrence of this day
          nextDate = nextDay(now, targetDay as 0 | 1 | 2 | 3 | 4 | 5 | 6);
          nextDate = setHours(nextDate, currentHour);
          nextDate = setMinutes(nextDate, currentMinute);

          if (isBefore(now, nextDate)) {
            return nextDate;
          }
        }
      }

      // Fallback: next week same day
      nextDate = addWeeks(currentDateTime, 1);
      while (isBefore(nextDate, now)) {
        nextDate = addWeeks(nextDate, 1);
      }
      return nextDate;

    default:
      return null;
  }
}

// ── Open Game ─────────────────────────────────

export interface OpenGameResult {
  success: boolean;
  method: 'intent' | 'scheme' | 'store' | 'none';
  error?: string;
}

export function openGame(packageId: string): OpenGameResult {
  if (!packageId) {
    return { success: false, method: 'none', error: 'No package ID configured' };
  }

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isAndroid = /android/i.test(ua);
  const isIOS = /iphone|ipad|ipod/i.test(ua);

  try {
    if (isAndroid) {
      // Try Android intent
      window.location.href = `intent://#Intent;package=${packageId};end`;
      return { success: true, method: 'intent' };
    }

    if (isIOS) {
      // Try iOS URL scheme (generic)
      window.location.href = `${packageId}://`;
      return { success: true, method: 'scheme' };
    }

    // Desktop fallback: open Play Store
    window.open(`https://play.google.com/store/apps/details?id=${packageId}`, '_blank');
    return { success: true, method: 'store' };
  } catch (err) {
    return { success: false, method: 'none', error: String(err) };
  }
}

// ── Snooze Options ────────────────────────────

export const SNOOZE_OPTIONS = [
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
] as const;

export function calculateSnoozeTime(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

// ── Service Worker Message Handler ────────────

function handleSWMessage(event: MessageEvent) {
  const { type, payload } = event.data;

  switch (type) {
    case 'NOTIFICATION_TRIGGERED':
      console.log('[Engine] Notification triggered:', payload);
      // Could dispatch event or update state
      window.dispatchEvent(new CustomEvent('reminder-triggered', {
        detail: payload,
      }));
      break;

    case 'NOTIFICATION_CLICKED':
      console.log('[Engine] Notification clicked:', payload);
      window.dispatchEvent(new CustomEvent('reminder-clicked', {
        detail: payload,
      }));
      break;

    case 'SNOOZE_REMINDER':
      console.log('[Engine] Snooze requested:', payload);
      window.dispatchEvent(new CustomEvent('reminder-snooze', {
        detail: payload,
      }));
      break;

    case 'DISMISS_REMINDER':
      console.log('[Engine] Dismiss requested:', payload);
      window.dispatchEvent(new CustomEvent('reminder-dismiss', {
        detail: payload,
      }));
      break;

    case 'OPEN_GAME':
      console.log('[Engine] Open game requested:', payload);
      if (payload.gamePackageId) {
        openGame(payload.gamePackageId);
      }
      break;
  }
}

// ── Alarm Callback ────────────────────────────

export function setAlarmCallback(callback: AlarmCallback | null) {
  alarmCallback = callback;
}

// ── Reschedule All Active Reminders ───────────
// Called on app startup to ensure all reminders are scheduled

export async function rescheduleAllReminders(): Promise<number> {
  try {
    const res = await fetch('/api/reminders?filter=pending');
    const reminders: ReminderData[] = await res.json();

    let scheduled = 0;
    for (const reminder of reminders) {
      if (reminder.enabled && new Date(reminder.scheduledDateTime) > new Date()) {
        await scheduleReminder(reminder);
        scheduled++;
      }
    }

    console.log(`[Engine] Rescheduled ${scheduled} reminders`);
    return scheduled;
  } catch (err) {
    console.error('[Engine] Failed to reschedule reminders:', err);
    return 0;
  }
}

// ── Export Engine State ───────────────────────

export function getEngineState() {
  return {
    isInitialized,
    hasServiceWorker: !!swRegistration,
    scheduledCount: scheduledNotifications.size,
    triggeredCount: triggeredNotifications.size,
    permission: getNotificationPermission(),
  };
}
