import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://bazarchowkapi.veritasco.tech';

export default function AuthHandlerScreen() {
  const { accessToken, refreshToken } = useLocalSearchParams();
  const router = useRouter();

  useEffect(() => {
    async function handleAuth() {
      if (accessToken && refreshToken) {
        // Save tokens
        await SecureStore.setItemAsync('rider_token', accessToken as string);
        await SecureStore.setItemAsync('rider_refresh_token', refreshToken as string);
        
        // Fetch profile to check if phone is missing
        try {
          const res = await fetch(`${API_URL}/users/me`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          if (res.ok) {
            const user = await res.json();
            if (!user.phone) {
              router.replace('/register');
              return;
            }
          }
        } catch (e) {
          console.error('Failed to fetch profile', e);
        }
        
        // Redirect to home
        router.replace('/');
      } else {
        // If no tokens, just go back to login
        router.replace('/login');
      }
    }
    handleAuth();
  }, [accessToken, refreshToken]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
      <ActivityIndicator size="large" color="#00B140" />
    </View>
  );
}
