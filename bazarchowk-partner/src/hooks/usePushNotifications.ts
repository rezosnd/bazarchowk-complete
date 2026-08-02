import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (e) {
  console.log('expo-notifications is not available in this environment');
}

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://bazarchowk-complete.vercel.app'; // Fallback

export function usePushNotifications() {
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    if (!Notifications) return;

    async function initPush() {
      const token = await SecureStore.getItemAsync('partner_token') || await SecureStore.getItemAsync('bazar_access_token');
      if (!token) return;

      const pushToken = await registerForPushNotificationsAsync();
      if (pushToken) {
        fetch(`${API_BASE}/notifications/device`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ token: pushToken, deviceOs: Platform.OS })
        }).catch(err => console.log('Failed to register device token', err));
      }
    }
    initPush();

    notificationListener.current = Notifications.addNotificationReceivedListener((notification: any) => {
      console.log('Received Push Notification:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
      console.log('Tapped Push Notification:', response);
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);
}

async function registerForPushNotificationsAsync() {
  if (!Notifications) return null;
  let token;

  if (Constants.appOwnership === 'expo') {
    console.log('Skipping push token registration in Expo Go.');
    return null;
  }

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#00B140',
      });
    } catch (e) {
      console.log('Failed to set notification channel (this is normal in some Expo Go versions)', e);
    }
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }

    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;

      if (!projectId) {
         // Using standard FCM fallback if EAS is not configured
         token = (await Notifications.getDevicePushTokenAsync()).data;
      } else {
        token = (
          await Notifications.getExpoPushTokenAsync({
            projectId,
          })
        ).data;
      }
    } catch (e: any) {
      console.warn('Failed to get push token. Note: Push Notifications do not work in Expo Go in SDK 53+. Use a development build.', e.message);
      return null;
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}
