import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';
import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';

import { BazarChowkSplashOverlay } from '../components/splash-screen';
import AppTabs from '@/components/app-tabs';
import { usePushNotifications } from '../hooks/usePushNotifications';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [appReady, setAppReady] = useState(false);

  usePushNotifications();

  useEffect(() => {
    SplashScreen.hideAsync();
    setTimeout(() => {
      setAppReady(true);
      import('../services/socket').then(({ socketService }) => {
        socketService.connect();
      });
    }, 1500);
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <BazarChowkSplashOverlay appReady={appReady} />
      <AppTabs />
    </ThemeProvider>
  );
}
