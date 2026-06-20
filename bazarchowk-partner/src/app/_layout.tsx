import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BazarChowkSplashOverlay } from '../components/splash-screen';
import * as SplashScreen from 'expo-splash-screen';
import { usePushNotifications } from '../hooks/usePushNotifications';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);

  usePushNotifications();

  useEffect(() => {
    SplashScreen.hideAsync();
    // Simulate initialization (e.g. checking auth)
    setTimeout(() => {
      setAppReady(true);
      import('../services/socket').then(({ socketService }) => {
        socketService.connect();
      });
    }, 1500);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" translucent />
        <QueryClientProvider client={queryClient}>
          <BazarChowkSplashOverlay appReady={appReady} />
          <Stack screenOptions={{ headerShown: false }} />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
