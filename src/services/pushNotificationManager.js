import { Platform, NativeModules, NativeEventEmitter, AppState, PermissionsAndroid } from 'react-native';
import { registerDeviceApi, deactivateDeviceApi, fetchPendingPushesApi } from './apiClient';

function getPushBridge() {
  return NativeModules.PushNotificationBridge || null;
}

let pushEmitter = null;
function getPushEmitter() {
  const bridge = getPushBridge();
  if (!pushEmitter && bridge) {
    try {
      pushEmitter = new NativeEventEmitter(bridge);
    } catch (e) {
      console.log('[PushNotificationManager] NativeEventEmitter note:', e.message);
    }
  }
  return pushEmitter;
}

// In-memory state
let currentDeviceToken = null;
let notificationListeners = new Set();
let deliveredPushIds = new Set();
let lastSyncTimestamp = new Date(Date.now() - 30000).toISOString();
let activeSyncTimer = null;
let appStateSubscription = null;

/**
 * Generate a consistent device token for this client instance
 */
export function getOrCreateDeviceToken() {
  if (!currentDeviceToken) {
    const randomSuffix = Math.random().toString(36).substring(2, 10);
    currentDeviceToken = `device_${Platform.OS}_token_${Date.now().toString(36)}_${randomSuffix}`;
  }
  return currentDeviceToken;
}

/**
 * Collect device hardware and operating system metadata
 */
export function getDeviceInfo() {
  const isAndroid = Platform.OS === 'android';
  const isIOS = Platform.OS === 'ios';

  return {
    platform: Platform.OS || 'android',
    deviceModel: isAndroid ? 'Android Device' : isIOS ? 'Apple iPhone' : 'Web Client',
    osVersion: isAndroid ? `Android ${Platform.Version || '14'}` : isIOS ? `iOS ${Platform.Version || '17'}` : 'Browser',
    appVersion: '1.0.0',
  };
}

/**
 * Request notification permissions from operating system.
 * Explicitly handles Android 13+ (API 33+) POST_NOTIFICATIONS runtime permission.
 */
export async function requestPushPermissions() {
  try {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 33) {
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        if (!hasPermission) {
          const status = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            {
              title: 'Task Push Notifications',
              message: 'JobSheetFlow needs notification permissions to alert you in the status bar when tasks are assigned.',
              buttonPositive: 'Allow',
              buttonNegative: 'Deny',
            }
          );
          console.log('📲 [Android POST_NOTIFICATIONS status]:', status);
          return status === PermissionsAndroid.RESULTS.GRANTED;
        }
        return true;
      }
      return true;
    }

    const bridge = getPushBridge();
    if (bridge && typeof bridge.requestPermissions === 'function') {
      return await bridge.requestPermissions();
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
      return await window.Notification.requestPermission();
    }
  } catch (err) {
    console.warn('[requestPushPermissions Warning]:', err.message);
  }
  return true;
}

/**
 * Check if a userId belongs to the Owner
 */
function isOwnerId(userId) {
  if (!userId) return false;
  const clean = String(userId).trim().toLowerCase();
  return clean === 'owner' || clean === 'admin';
}

/**
 * Display a real system notification in the device's notification panel / status bar.
 * ONLY displayed for employees for their assigned tasks; NEVER displayed for Owner!
 */
export async function displaySystemNotification({ title, body, data = {} }) {
  // Guard: Owner must NEVER receive push notifications
  if (data?.role === 'owner' || data?.targetRole === 'owner') {
    return;
  }

  const pushId = data.id || data._id || `${data.jobSheetId}_${data.taskId}_${Date.now()}`;
  if (deliveredPushIds.has(pushId)) {
    return;
  }
  deliveredPushIds.add(pushId);

  // 1. Native Status Bar Notification
  try {
    const bridge = getPushBridge();
    if (bridge && typeof bridge.displayNotification === 'function') {
      await bridge.displayNotification(title, body, data);
      console.log(`📲 [System Notification Displayed (${Platform.OS})]: "${title}" in status bar/panel.`);
    } else if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
      if (window.Notification.permission === 'granted') {
        new window.Notification(title, {
          body,
          icon: '/favicon.ico',
          data,
        });
      }
    }
  } catch (nativeErr) {
    console.warn('[displaySystemNotification Native Error]:', nativeErr.message);
  }

  // 2. In-app banner & notification emitter (always alongside system notification)
  emitIncomingNotification({
    id: pushId,
    type: data.type || 'TASK_ASSIGNED',
    title,
    message: body,
    jobSheetId: data.jobSheetId,
    taskId: data.taskId,
    timestamp: new Date().toISOString(),
    read: false,
    ...data,
  });
}

/**
 * Display real-time OTP notification banner and Android status bar notification
 */
export async function displayOtpNotification({ otp, mobileNumber }) {
  const title = '🔐 Verification Code';
  const body = `Your JobSheetFlow verification code is ${otp}.`;

  try {
    const bridge = getPushBridge();
    if (bridge && typeof bridge.displayNotification === 'function') {
      await bridge.displayNotification(title, body, { type: 'OTP', otp });
      console.log(`📲 [Native OTP Notification Dispatched (${Platform.OS})]: ${otp}`);
    }
  } catch (err) {
    console.warn('[displayOtpNotification native warning]:', err.message);
  }

  emitIncomingNotification({
    id: `otp-${Date.now()}`,
    type: 'OTP',
    title,
    message: `Your verification code is ${otp}. Tap to view.`,
    body: `Your verification code is ${otp}. Tap to view.`,
    otp,
    mobileNumber,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Register device token with backend database
 * ONLY registers devices for employees!
 */
export async function registerDeviceForUser(userId) {
  if (!userId || isOwnerId(userId)) {
    return null;
  }

  const deviceToken = getOrCreateDeviceToken();
  const info = getDeviceInfo();

  try {
    const res = await registerDeviceApi({
      userId: String(userId),
      deviceToken,
      platform: info.platform,
      deviceModel: info.deviceModel,
      osVersion: info.osVersion,
      appVersion: info.appVersion,
    });
    console.log(`📱 [Device Registered]: Employee "${userId}" with token ending in ...${deviceToken.slice(-8)}`);
    return res;
  } catch (err) {
    console.warn(`⚠️ [Device Registration Warning]:`, err.message);
    return null;
  }
}

/**
 * Deactivate device token on logout
 */
export async function deactivateDeviceForUser(userId) {
  if (!userId && !currentDeviceToken) return;

  try {
    await deactivateDeviceApi(userId, currentDeviceToken);
    console.log(`📱 [Device Deactivated]: User "${userId}"`);
  } catch (err) {
    console.warn(`⚠️ [Device Deactivation Warning]:`, err.message);
  }
}

/**
 * Subscribe to incoming push notifications
 */
export function addNotificationListener(callback) {
  notificationListeners.add(callback);
  return () => {
    notificationListeners.delete(callback);
  };
}

/**
 * Emit an incoming notification to active listeners
 */
export function emitIncomingNotification(notificationData) {
  notificationListeners.forEach((listener) => {
    try {
      listener(notificationData);
    } catch (e) {
      console.warn('Notification listener error:', e);
    }
  });
}

/**
 * Pull and present pending push notifications for an employee
 * ONLY executed for employees!
 */
export async function checkAndDeliverPendingPushes(userId) {
  if (!userId || isOwnerId(userId)) {
    return;
  }

  try {
    const res = await fetchPendingPushesApi(userId, lastSyncTimestamp);
    if (res && res.success && Array.isArray(res.pushes)) {
      for (const push of res.pushes) {
        if (!deliveredPushIds.has(push.id)) {
          await displaySystemNotification({
            title: push.title,
            body: push.body,
            data: {
              id: push.id,
              type: push.type,
              jobSheetId: push.jobSheetId,
              taskId: push.taskId,
              ...(push.metadata || {}),
            },
          });
        }
      }
      lastSyncTimestamp = new Date().toISOString();
    }
  } catch (err) {
    // Silent background sync error
  }
}

/**
 * Start background & foreground push sync service for the current authenticated user.
 * STRICT ENFORCEMENT: ONLY employees receive push notifications for their assigned tasks!
 * The Owner is excluded and will never receive push notifications.
 */
export function startPushNotificationService(userId, onNotificationOpened, userRole = 'EMPLOYEE') {
  if (!userId || isOwnerId(userId) || userRole === 'OWNER') {
    console.log('ℹ️ [PushNotificationManager]: Owner role is excluded from push notification service.');
    return () => {};
  }

  requestPushPermissions();
  registerDeviceForUser(userId);

  // Check on cold start
  checkAndDeliverPendingPushes(userId);

  // Handle native notification click (from closed / background state)
  let tapSubscription = null;
  const emitter = getPushEmitter();
  if (emitter) {
    try {
      tapSubscription = emitter.addListener('onNotificationTapped', (payload) => {
        console.log('📲 [Push Notification Tapped]:', payload);
        if (onNotificationOpened && payload) {
          onNotificationOpened({
            jobSheetId: payload.jobSheetId,
            taskId: payload.taskId,
          });
        }
      });
    } catch (e) {
      // safe fallback
    }
  }

  // Periodic push sync timer (every 4 seconds for instant push delivery in foreground & background)
  if (activeSyncTimer) clearInterval(activeSyncTimer);
  activeSyncTimer = setInterval(() => {
    checkAndDeliverPendingPushes(userId);
  }, 4000);

  // AppState change listener: check immediately when app moves between background & foreground
  if (appStateSubscription) appStateSubscription.remove();
  appStateSubscription = AppState.addEventListener('change', (nextState) => {
    console.log(`📱 [AppState Changed]: ${nextState}`);
    checkAndDeliverPendingPushes(userId);
  });

  return () => {
    if (activeSyncTimer) {
      clearInterval(activeSyncTimer);
      activeSyncTimer = null;
    }
    if (appStateSubscription) {
      appStateSubscription.remove();
      appStateSubscription = null;
    }
    if (tapSubscription) {
      tapSubscription.remove();
    }
  };
}
