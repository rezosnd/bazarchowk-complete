import { Stack, router, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import * as SecureStore from 'expo-secure-store';
import { BazarChowkSplashOverlay } from '../components/splash-screen';
import { usePushNotifications } from '../hooks/usePushNotifications';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const segments = useSegments();

  usePushNotifications();

  useEffect(() => {
    async function checkAuth() {
      try {
        const token = await SecureStore.getItemAsync('rider_token');
        setIsAuthenticated(!!token);
      } catch (e) {
        setIsAuthenticated(false);
      } finally {
        SplashScreen.hideAsync();
        setTimeout(() => setAppReady(true), 1500);
      }
    }
    checkAuth();
  }, []);

  useEffect(() => {
    if (!appReady) return;

    const checkRoute = async () => {
      const token = await SecureStore.getItemAsync('rider_token');
      const inAuthGroup = segments[0] === '(auth)';
      
      if (!token && !inAuthGroup) {
        router.replace('/(auth)/login');
      } else if (token && inAuthGroup) {
        router.replace('/');
      }
    };
    
    checkRoute();
  }, [segments, appReady]);

  return (
    <>
      <BazarChowkSplashOverlay appReady={appReady} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
