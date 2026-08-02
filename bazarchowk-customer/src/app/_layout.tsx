import 'react-native-gesture-handler';
import '@/i18n';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SplashScreen, Stack, useRouter, useSegments } from 'expo-router';
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
      staleTime: 0,               // ALWAYS fetch fresh data (no caching delay)
      gcTime: 1_000 * 60 * 5,     // Keep in garbage collector for 5 mins
      refetchOnMount: true,       // Refetch when navigating back to a screen
      refetchOnWindowFocus: true, // Refetch when app comes back from background
    },
    mutations: { retry: 0 },
  },
});

import { usePushNotifications } from '@/hooks/usePushNotifications';

// ─── Root Layout ──────────────────────────────────────────────────────────────
export default function RootLayout() {
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user           = useAuthStore((s) => s.user);
  const initialize     = useAuthStore((s) => s.initialize);

  const segments = useSegments();
  const router = useRouter();

  // Register push notifications
  usePushNotifications();

  useEffect(() => {
    // Drop native splash instantly; our animated JS overlay is already visible
    SplashScreen.hideAsync();
    // Kick off auth/store initialisation; store sets isInitialized when done
    initialize();
  }, [initialize]);

  useEffect(() => {
    import('@/services/socket')
      .then(({ socketService }) => {
        if (isAuthenticated) {
          socketService.connect();
        } else {
          socketService.disconnect();
        }
      })
      .catch((error) => {
        console.warn('Failed to load socket service:', error);
      });
  }, [isAuthenticated]);

  // ─── Mandatory Phone Number Wall ─────────────────────────────────────────────
  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';
    
    if (isAuthenticated && user) {
      if (!user.phone && segments.join('/') !== '(auth)/complete-profile') {
        // If they are logged in (e.g. Google Auth) but have no phone number, FORCE them here
        router.replace('/(auth)/complete-profile' as any);
      } else if (user.phone && inAuthGroup) {
        // If they are fully authenticated and have a phone, send them to tabs
        router.replace('/(tabs)');
      }
    } else if (!isAuthenticated && !inAuthGroup) {
      // Not authenticated, send to login
      router.replace('/(auth)/login');
    }
  }, [isInitialized, isAuthenticated, user?.phone, segments]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          {/* Translucent so splash image fills edge-to-edge on Android */}
          <StatusBar style="light" />

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
