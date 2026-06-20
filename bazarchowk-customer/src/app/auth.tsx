import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '@/store';
import { TokenStorage } from '@/services/api';

export default function AuthHandlerScreen() {
  const { accessToken, refreshToken } = useLocalSearchParams();
  const router = useRouter();
  const { initialize } = useAuthStore();

  useEffect(() => {
    async function handleAuth() {
      if (accessToken && refreshToken) {
        // Save tokens
        await TokenStorage.setTokens(accessToken as string, refreshToken as string);
        // Initialize user profile
        await initialize();
        
        // Check if user is missing phone number
        const user = useAuthStore.getState().user;
        if (user && !user.phone) {
          router.replace('/register');
        } else {
          router.replace('/(tabs)');
        }
      } else {
        // If no tokens, just go back to login
        router.replace('/login');
      }
    }
    handleAuth();
  }, [accessToken, refreshToken]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3FAF5' }}>
      <ActivityIndicator size="large" color="#00B140" />
    </View>
  );
}
