import { Text as AppText } from '@/components/TranslatedText';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
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
import api from '@/services/api';
import { Button, Input } from '@/components/ui';
import { useTheme } from '@/hooks';
import { useAuthStore } from '@/store';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/theme';

export default function RegisterScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { initialize, user } = useAuthStore();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = 'First Name is required';
    if (!lastName.trim()) e.lastName = 'Last Name is required';
    if (!phone || phone.length < 10) e.phone = 'Enter a valid mobile number';
    return e;
  };

  const handleCompleteProfile = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    setErrors({});
    try {
      await api.patch('/users/me', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim()
      });
      await initialize();
      router.replace('/(tabs)');
    } catch (e: unknown) {
      setErrors({ general: 'Failed to update profile. Please try again.' });
    } finally {
      setLoading(false);
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
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/APP-ICON.png')}
              style={styles.logo}
              contentFit="contain"
            />
          </View>
          <AppText style={styles.headerTitle}>Complete Profile</AppText>
          <AppText style={styles.headerSubtitle}>Just one more step to start shopping</AppText>
        </LinearGradient>

        <View style={[styles.form, { backgroundColor: theme.background }]}>
          {errors.general && (
            <View style={styles.errorBanner}>
              <AppText style={styles.errorBannerText}>{errors.general}</AppText>
            </View>
          )}

          <AppText style={[styles.formTitle, { color: theme.text }]}>Almost there!</AppText>
          <AppText style={[styles.formSubtitle, { color: theme.textSecondary }]}>
            Please verify your details and enter your mobile number.
          </AppText>

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
              value={email}
              editable={false}
              style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}
            />
            
            <View style={{ height: 16 }} />
            <Input
              label="Mobile Number"
              placeholder="+91 98765 43210"
              value={phone}
              onChangeText={(t) => { setPhone(t); setErrors((e) => ({ ...e, phone: '' })); }}
              keyboardType="phone-pad"
              error={errors.phone}
              required
            />
          </View>

          <Button
            title="Complete Registration"
            onPress={handleCompleteProfile}
            loading={loading}
            style={{ marginTop: 24 }}
          />

          <View style={styles.footerSpacer} />

          <AppText style={[styles.termsText, { color: theme.textSecondary }]}>
            By registering, you agree to BazarChowk's{' '}
            <AppText style={{ color: theme.primary, fontWeight: '600' }}>Terms of Service</AppText>{' '}
            and{' '}
            <AppText style={{ color: theme.primary, fontWeight: '600' }}>Privacy Policy</AppText>
          </AppText>
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
  errorBanner: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  errorBannerText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  formTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  formSubtitle: { fontSize: 15, lineHeight: 22, marginTop: -4, marginBottom: 8 },
  footerSpacer: {
    flex: 1,
    minHeight: 16,
  },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Platform.OS === 'ios' ? 40 : 24,
  },
});
