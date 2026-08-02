import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
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
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { TokenStorage } from '@/services/api';
import { Button, Input } from '@/components/ui';
import { useTheme } from '@/hooks';
import { useAuthStore } from '@/store';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/theme';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { login, guestLogin, initialize } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !email.includes('@')) {
      setError('Enter a valid email address');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      router.replace('/' as any);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    try {
      await guestLogin('device-' + Math.random().toString(36).substring(7));
      router.replace('/' as any);
    } catch (e) {
      setError('Failed to join as guest');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const redirectUri = Linking.createURL('auth');
      const authUrl = `${process.env.EXPO_PUBLIC_API_URL || 'https://bazarchowk-complete.vercel.app'}/auth/google?redirectUri=${encodeURIComponent(redirectUri)}`;
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
            await TokenStorage.setTokens(accessToken, refreshToken);
            await initialize();
            const user = useAuthStore.getState().user;
            if (user && !user.phone) {
              router.replace('/register');
            } else {
              router.replace('/(tabs)');
            }
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
      style={{ flex: 1, backgroundColor: theme.background }}
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
          style={[styles.topHeader, { paddingTop: insets.top + Spacing.lg }]}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/APP-ICON.png')}
              style={styles.logo}
              contentFit="contain"
            />
          </View>
          <Text style={styles.headerTitle}>BazarChowk</Text>
          <Text style={styles.headerSubtitle}>India's Premier Super App</Text>
        </LinearGradient>

        <View style={[styles.form, { backgroundColor: theme.background }]}>
          <Text style={[styles.formTitle, { color: theme.text }]}>Welcome Back</Text>
          <Text style={[styles.formSubtitle, { color: theme.textSecondary }]}>
            Login to your account
          </Text>

          <TouchableOpacity style={styles.googleBtn} activeOpacity={0.7} onPress={handleGoogleLogin}>
            <Ionicons name="logo-google" size={24} color="#DB4437" />
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>

          <View style={styles.footerSpacer} />

          <Text style={[styles.termsText, { color: theme.textSecondary }]}>
            By continuing, you agree to BazarChowk's{' '}
            <Text style={{ color: theme.primary, fontWeight: '600' }}>Terms of Service</Text>{' '}
            and{' '}
            <Text style={{ color: theme.primary, fontWeight: '600' }}>Privacy Policy</Text>
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
    paddingHorizontal: Spacing.xl,
  },
  backBtn: { 
    alignSelf: 'flex-start', 
    marginBottom: Spacing.md,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
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
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 20,
  },
  formTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  formSubtitle: { fontSize: 15, lineHeight: 22, marginTop: -4, marginBottom: 8 },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
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
  },
  googleBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  footerSpacer: {
    flex: 1,
    minHeight: 16,
  },
  loginLink: { alignItems: 'center', marginBottom: 16 },
  loginText: { fontSize: 15, textAlign: 'center' },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Platform.OS === 'ios' ? 40 : 24,
  },
});
