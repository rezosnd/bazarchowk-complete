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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { Button, Input } from '@/components/ui';
import { useTheme } from '@/hooks';
import { useAuthStore } from '@/store';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/theme';

export default function RegisterScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { register } = useAuthStore();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = 'First Name is required';
    if (!lastName.trim()) e.lastName = 'Last Name is required';
    if (!email || !email.includes('@')) e.email = 'Enter a valid email address';
    if (!password || password.length < 6) e.password = 'Password must be at least 6 characters';
    return e;
  };

  const handleRegister = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    setErrors({});
    try {
      await register(firstName.trim(), lastName.trim(), email.trim(), password);
      router.replace('/' as any);
    } catch (e: unknown) {
      setErrors({ general: e instanceof Error ? e.message : 'Registration failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await WebBrowser.openAuthSessionAsync(
        'https://bazarchowkapi.veritasco.tech/auth/google',
        'bazarchowk://auth'
      );
    } catch (e) {
      console.log('Google Auth Error:', e);
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
        {/* Top premium green header */}
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
          <Text style={styles.headerTitle}>Create Account</Text>
          <Text style={styles.headerSubtitle}>Join India's Premier Super App</Text>
        </LinearGradient>

        <View style={[styles.form, { backgroundColor: theme.background }]}>
          {errors.general && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{errors.general}</Text>
            </View>
          )}

          <Text style={[styles.formTitle, { color: theme.text }]}>Get Started</Text>
          <Text style={[styles.formSubtitle, { color: theme.textSecondary }]}>
            Enter your details below to create your account
          </Text>

          <View style={{ marginTop: 8 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="First Name"
                  placeholder="John"
                  value={firstName}
                  onChangeText={(t) => { setFirstName(t); setErrors((e) => ({ ...e, firstName: '' })); }}
                  error={errors.firstName}
                  required
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Last Name"
                  placeholder="Doe"
                  value={lastName}
                  onChangeText={(t) => { setLastName(t); setErrors((e) => ({ ...e, lastName: '' })); }}
                  error={errors.lastName}
                  required
                />
              </View>
            </View>
            
            <View style={{ height: 16 }} />
            <Input
              label="Email Address"
              placeholder="you@example.com"
              value={email}
              onChangeText={(t) => { setEmail(t.trim()); setErrors((e) => ({ ...e, email: '' })); }}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              required
            />
            <View style={{ height: 16 }} />
            <Input
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: '' })); }}
              secureTextEntry
              error={errors.password}
              required
            />
          </View>

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={loading}
            style={{ marginTop: 8 }}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={[styles.dividerText, { color: theme.textSecondary }]}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.googleBtn} activeOpacity={0.7} onPress={handleGoogleLogin}>
            <Ionicons name="logo-google" size={24} color="#DB4437" />
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>

          <View style={styles.footerSpacer} />

          <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={styles.loginLink}>
            <Text style={[styles.loginText, { color: theme.textSecondary }]}>
              Already have an account?{' '}
              <Text style={{ color: theme.primary, fontWeight: '700' }}>Sign In</Text>
            </Text>
          </TouchableOpacity>

          <Text style={[styles.termsText, { color: theme.textSecondary }]}>
            By registering, you agree to BazarChowk's{' '}
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
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: 8,
  },
  errorBannerText: { color: '#EF4444', fontSize: FontSize.sm, fontWeight: FontWeight.medium },
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
