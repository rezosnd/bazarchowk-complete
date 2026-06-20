import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export default function PartnerLoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error('Invalid credentials');
      
      const data = await res.json();
      if (data.user?.role?.name !== 'SHOP_OWNER' && data.user?.role?.name !== 'SHOP_STAFF') {
        throw new Error('Unauthorized: You are not a partner');
      }
      await SecureStore.setItemAsync('partner_token', data.accessToken);
      if (data.refreshToken) {
        await SecureStore.setItemAsync('partner_refresh_token', data.refreshToken);
      }
      router.replace('/');
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
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
          <Text style={styles.headerTitle}>Partner Portal</Text>
          <Text style={styles.headerSubtitle}>Manage your shop and grow</Text>
        </LinearGradient>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Welcome Back</Text>
          <Text style={styles.formSubtitle}>Login to your partner account</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={{ marginTop: 8 }}>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="partner@example.com"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={(t) => { setEmail(t.trim()); setError(''); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={{ height: 16 }} />

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(''); }}
                  secureTextEntry
                />
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, (!email || password.length < 6) && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading || !email || password.length < 6}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.loginBtnText}>Login to Dashboard</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footerSpacer} />

          <Text style={styles.termsText}>
            By continuing, you agree to BazarChowk's{' '}
            <Text style={{ color: '#00B140', fontWeight: '600' }}>Partner Terms</Text>{' '}
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
  errorText: { color: '#EF4444', fontSize: 14, fontWeight: '500', marginBottom: 4 },
  inputWrapper: { gap: 6 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#F9FAFB',
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: '#111827' },
  loginBtn: {
    height: 56,
    backgroundColor: '#00B140',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    shadowColor: '#00B140',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  loginBtnDisabled: { backgroundColor: '#A7F3D0', shadowOpacity: 0 },
  loginBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  footerSpacer: { flex: 1, minHeight: 24 },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    color: '#6B7280',
    marginBottom: Platform.OS === 'ios' ? 40 : 24,
  },
});
