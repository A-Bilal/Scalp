// Web Notification API Helper for Browser Push Notifications

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.warn('Could not request notification permission:', error);
    return Notification.permission;
  }
}

export function sendPushNotification(title: string, options?: {
  body?: string;
  tag?: string;
  icon?: string;
  data?: any;
}): boolean {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    const notification = new Notification(title, {
      body: options?.body,
      tag: options?.tag,
      icon: options?.icon || 'https://binance.com/favicon.ico',
      badge: 'https://binance.com/favicon.ico',
      silent: false, // let system sound play if enabled
      ...options?.data,
    });

    // Auto close notification after 8 seconds
    setTimeout(() => {
      try {
        notification.close();
      } catch {}
    }, 8000);

    return true;
  } catch (error) {
    console.warn('Failed to dispatch notification:', error);
    return false;
  }
}
