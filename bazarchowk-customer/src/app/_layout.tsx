import '@/i18n';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BazarChowkSplashOverlay } from '@/components/splash-screen';
import { useAuthStore } from '@/store';

// ─── Hide native splash immediately; JS overlay takes over ───────────────────
SplashScreen.preventAutoHideAsync();

// ─── React Query Client ───────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1_000 * 60 * 5,  // 5 min
      gcTime:    1_000 * 60 * 30, // 30 min
    },
    mutations: { retry: 0 },
  },
});

import { usePushNotifications } from '@/hooks/usePushNotifications';

// ─── Root Layout ──────────────────────────────────────────────────────────────
export default function RootLayout() {
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const initialize     = useAuthStore((s) => s.initialize);

  // Register push notifications
  usePushNotifications();

  useEffect(() => {
    // Drop native splash instantly; our animated JS overlay is already visible
    SplashScreen.hideAsync();
    // Kick off auth/store initialisation; store sets isInitialized when done
    initialize();
  }, [initialize]);

  useEffect(() => {
    import('@/services/socket').then(({ socketService }) => {
      if (isAuthenticated) {
        socketService.connect();
      } else {
        socketService.disconnect();
      }
    });
  }, [isAuthenticated]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          {/* Translucent so splash image fills edge-to-edge on Android */}
          <StatusBar style="light" translucent />

          {/* Premium animated splash overlay — exits when isInitialized = true */}
          <BazarChowkSplashOverlay appReady={isInitialized} />

          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(auth)" />
            {/* NOTE: "[...unmatched]" removed — Expo Router handles 404s automatically */}
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
