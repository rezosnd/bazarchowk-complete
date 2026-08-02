import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://bazarchowk-complete.vercel.app';

WebBrowser.maybeCompleteAuthSession();

export default function RiderLoginScreen() {
  const insets = useSafeAreaInsets();

  const handleGoogleLogin = async () => {
    try {
      const redirectUri = Linking.createURL('auth');
      const authUrl = `${API_URL}/auth/google?redirectUri=${encodeURIComponent(redirectUri)}&state=rider`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      
      if (result.type === 'success' && result.url) {
        const queryStr = result.url.split('?')[1];
        if (queryStr) {
          const params = queryStr.split('&');
          let accessToken = '';
          let refreshToken = '';
          params.forEach(param => {
            const [key, val] = param.split('=');
            if (key === 'accessToken') accessToken = val;
            if (key === 'refreshToken') refreshToken = val;
          });
          
          if (accessToken && refreshToken) {
            await SecureStore.setItemAsync('rider_token', accessToken);
            await SecureStore.setItemAsync('rider_refresh_token', refreshToken);
            
            // Check if profile has phone
            const profileRes = await fetch(`${API_URL}/users/me`, {
              headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (profileRes.ok) {
              const user = await profileRes.json();
              if (!user.phone) {
                router.replace('/register');
                return;
              }
            }
            router.replace('/');
          }
        }
      }
    } catch (e: any) {
      console.log('Google Auth Error:', e);
      Alert.alert('Google Auth Error', e.message || 'Something went wrong.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#00B140', '#00752A']}
          style={[styles.topHeader, { paddingTop: insets.top + 24 }]}
        >
          <View style={styles.logoContainer}>
            <Image
              source={require('../../../assets/images/APP-ICON.png')}
              style={styles.logo}
              contentFit="contain"
            />
          </View>
          <Text style={styles.headerTitle}>Rider Portal</Text>
          <Text style={styles.headerSubtitle}>Sign in to start delivering</Text>
        </LinearGradient>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Welcome Back</Text>
          <Text style={styles.formSubtitle}>Sign in to your rider account</Text>

          <TouchableOpacity style={styles.googleBtn} activeOpacity={0.7} onPress={handleGoogleLogin}>
            <Ionicons name="logo-google" size={24} color="#DB4437" />
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>

          <View style={styles.footerSpacer} />

          <Text style={styles.termsText}>
            By continuing, you agree to BazarChowk's{' '}
            <Text style={{ color: '#00B140', fontWeight: '600' }}>Rider Terms</Text>{' '}
            and{' '}
            <Text style={{ color: '#00B140', fontWeight: '600' }}>Privacy Policy</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    alignItems: 'center',
    paddingBottom: 48,
    paddingHorizontal: 24,
  },
  logoContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  logo: { width: 48, height: 48 },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    fontWeight: '500',
    marginTop: 4,
  },
  form: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -32,
    backgroundColor: '#FFFFFF',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 20,
  },
  formTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, color: '#111827' },
  formSubtitle: { fontSize: 15, lineHeight: 22, marginTop: -4, marginBottom: 8, color: '#6B7280' },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginTop: 16,
  },
  googleBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  footerSpacer: { flex: 1, minHeight: 24 },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    color: '#6B7280',
    marginBottom: Platform.OS === 'ios' ? 40 : 24,
  },
});
