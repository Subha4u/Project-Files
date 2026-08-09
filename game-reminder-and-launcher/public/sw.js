// GameReminder Service Worker
// Handles background notifications and click actions

const CACHE_NAME = 'gamereminder-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(clients.claim());
});

// Listen for messages from the main app
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'SCHEDULE_NOTIFICATION':
      scheduleNotification(payload);
      break;
    case 'CANCEL_NOTIFICATION':
      cancelNotification(payload.notificationId);
      break;
    case 'SHOW_NOTIFICATION_NOW':
      showNotificationNow(payload);
      break;
  }
});

// Store for scheduled notifications (timeoutIds)
const scheduledTimeouts = new Map();

function scheduleNotification(payload) {
  const { notificationId, reminderId, title, body, gameId, gameName, gamePackageId, gameIcon, notificationType, scheduledTime } = payload;

  // Cancel any existing notification with the same ID
  cancelNotification(notificationId);

  const delay = scheduledTime - Date.now();

  if (delay <= 0) {
    // Already due, show immediately
    showNotificationNow(payload);
    return;
  }

  // Schedule for future
  const timeoutId = setTimeout(() => {
    showNotificationNow(payload);
    scheduledTimeouts.delete(notificationId);
  }, delay);

  scheduledTimeouts.set(notificationId, timeoutId);
  console.log(`[SW] Scheduled notification ${notificationId} for ${new Date(scheduledTime).toLocaleString()}`);
}

function cancelNotification(notificationId) {
  if (scheduledTimeouts.has(notificationId)) {
    clearTimeout(scheduledTimeouts.get(notificationId));
    scheduledTimeouts.delete(notificationId);
    console.log(`[SW] Cancelled notification ${notificationId}`);
  }
}

async function showNotificationNow(payload) {
  const { notificationId, reminderId, title, body, gameId, gameName, gamePackageId, gameIcon, notificationType } = payload;

  const isAlarm = notificationType === 'alarm';

  const options = {
    body: body,
    icon: gameIcon || '/favicon.svg',
    badge: '/favicon.svg',
    tag: notificationId,
    renotify: true,
    requireInteraction: isAlarm, // Alarm stays until user interacts
    silent: false,
    vibrate: isAlarm ? [200, 100, 200, 100, 200] : [200, 100, 200],
    data: {
      reminderId,
      gameId,
      gameName,
      gamePackageId,
      notificationType,
      url: '/',
    },
    actions: [
      { action: 'open_game', title: '▶ Open Game' },
      { action: 'snooze', title: '⏰ Snooze' },
      { action: 'dismiss', title: '✕ Dismiss' },
    ],
  };

  try {
    await self.registration.showNotification(title, options);
    console.log(`[SW] Showed notification: ${title}`);

    // Notify the main app that the notification was triggered
    const allClients = await clients.matchAll({ type: 'window' });
    for (const client of allClients) {
      client.postMessage({
        type: 'NOTIFICATION_TRIGGERED',
        payload: { reminderId, notificationId },
      });
    }
  } catch (err) {
    console.error('[SW] Failed to show notification:', err);
  }
}

// Handle notification clicks
self.addEventListener('notificationclick', async (event) => {
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  notification.close();

  event.waitUntil(handleNotificationAction(action, data));
});

async function handleNotificationAction(action, data) {
  const { reminderId, gamePackageId, gameName } = data;

  // Get all windows
  const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
  let appWindow = allClients.find(client => client.url.includes(self.location.origin));

  switch (action) {
    case 'open_game':
      // Try to open the game
      if (gamePackageId) {
        // Try Android intent
        const ua = '';
        const androidUrl = `intent://#Intent;package=${gamePackageId};end`;
        const playStoreUrl = `https://play.google.com/store/apps/details?id=${gamePackageId}`;

        // Notify app to mark as triggered
        if (appWindow) {
          appWindow.postMessage({
            type: 'OPEN_GAME',
            payload: { reminderId, gamePackageId, gameName },
          });
          appWindow.focus();
        } else {
          // Open the app with action parameter
          await clients.openWindow(`/?action=open_game&package=${encodeURIComponent(gamePackageId)}&reminder=${reminderId}`);
        }
      } else {
        // No package ID, just open app
        if (appWindow) {
          appWindow.focus();
        } else {
          await clients.openWindow('/');
        }
      }
      break;

    case 'snooze':
      // Notify app to snooze
      if (appWindow) {
        appWindow.postMessage({
          type: 'SNOOZE_REMINDER',
          payload: { reminderId },
        });
        appWindow.focus();
      } else {
        await clients.openWindow(`/?action=snooze&reminder=${reminderId}`);
      }
      break;

    case 'dismiss':
      // Notify app to dismiss
      if (appWindow) {
        appWindow.postMessage({
          type: 'DISMISS_REMINDER',
          payload: { reminderId },
        });
      } else {
        // Open app and dismiss
        await clients.openWindow(`/?action=dismiss&reminder=${reminderId}`);
      }
      break;

    default:
      // Default click - open app
      if (appWindow) {
        appWindow.postMessage({
          type: 'NOTIFICATION_CLICKED',
          payload: { reminderId },
        });
        appWindow.focus();
      } else {
        await clients.openWindow(`/?reminder=${reminderId}`);
      }
  }
}

// Handle notification close (swipe away)
self.addEventListener('notificationclose', async (event) => {
  const data = event.notification.data || {};

  // Notify app that notification was closed without action (potential overdue)
  const allClients = await clients.matchAll({ type: 'window' });
  for (const client of allClients) {
    client.postMessage({
      type: 'NOTIFICATION_CLOSED',
      payload: { reminderId: data.reminderId },
    });
  }
});

console.log('[SW] Service worker loaded');
