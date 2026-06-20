import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BazarChowkSplashOverlay } from '../components/splash-screen';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    SplashScreen.hideAsync();
    // Simulate initialization (e.g. checking auth)
    setTimeout(() => {
      setAppReady(true);
    }, 1500);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" translucent />
        <BazarChowkSplashOverlay appReady={appReady} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="shop" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
