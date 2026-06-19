import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks';
import { FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '@/theme';
import { Button, Card } from '@/components/ui';
import { useAuthStore } from '@/store';

import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, logout } = useAuthStore();

  const MENU_ITEMS = [
    { id: 'addresses', icon: 'location-outline', label: t('profile.savedAddresses') },
    { id: 'payments', icon: 'card-outline', label: t('profile.paymentMethods') },
    { id: 'notifications', icon: 'notifications-outline', label: t('profile.notifications') },
    { id: 'support', icon: 'headset-outline', label: t('profile.help') },
    { id: 'about', icon: 'information-circle-outline', label: t('profile.about') },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: insets.top + Spacing.base }]}>
        <Text style={[styles.title, { color: theme.text }]}>{t('profile.title')}</Text>
      </View>

      {/* User Info Card */}
      <Card style={styles.userCard} shadow="md">
        {isAuthenticated && user ? (
          <View style={styles.userInfo}>
            <View style={[styles.avatar, { backgroundColor: theme.primarySurface }]}>
              <Text style={styles.avatarText}>
                {user.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.userName, { color: theme.text }]}>{user.name}</Text>
              <Text style={[styles.userPhone, { color: theme.textSecondary }]}>{user.phone}</Text>
              {user.email && (
                <Text style={[styles.userEmail, { color: theme.textTertiary }]}>{user.email}</Text>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.guestInfo}>
            <Image
              source={require('@/assets/images/APP-ICON.png')}
              style={styles.guestLogo}
              contentFit="contain"
            />
            <Text style={[styles.guestTitle, { color: theme.text }]}>
              {t('profile.join')}
            </Text>
            <Text style={[styles.guestSubtitle, { color: theme.textSecondary }]}>
              {t('profile.signInSubtitle')}
            </Text>
            <Button
              title={t('profile.signInButton')}
              onPress={() => router.push('/(auth)/login')}
              size="md"
            />
          </View>
        )}
      </Card>

      {/* Menu Items */}
      <Card style={styles.menuCard}>
        {MENU_ITEMS.map((item, index) => (
          <View key={item.id}>
            <TouchableOpacity 
              style={styles.menuItem} 
              activeOpacity={0.7}
              onPress={() => {
                if (item.id === 'addresses') router.push('/addresses');
              }}
            >
              <View style={styles.menuIconWrap}>
                <Ionicons name={item.icon as any} size={22} color={theme.textSecondary} />
              </View>
              <Text style={[styles.menuLabel, { color: theme.text }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.border} />
            </TouchableOpacity>
            {index < MENU_ITEMS.length - 1 && (
              <View style={[styles.divider, { backgroundColor: theme.divider }]} />
            )}
          </View>
        ))}
      </Card>

      {/* Logout */}
      {isAuthenticated && (
        <View style={styles.logoutWrap}>
          <Button
            title={t('profile.logout')}
            variant="outline"
            onPress={logout}
          />
        </View>
      )}

      {/* App version */}
      <Text style={[styles.version, { color: theme.textTertiary }]}>
        BazarChowk v1.0.0
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.lg,
  },
  title: { fontSize: FontSize['3xl'], fontWeight: FontWeight.bold },
  userCard: { margin: Spacing.base, padding: Spacing.lg },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: FontSize['2xl'], fontWeight: FontWeight.bold, color: '#00B140' },
  userName: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  userPhone: { fontSize: FontSize.sm, marginTop: 2 },
  userEmail: { fontSize: FontSize.xs, marginTop: 2 },
  guestInfo: { alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  guestLogo: { width: 72, height: 72, borderRadius: BorderRadius.xl },
  guestTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  guestSubtitle: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
  menuCard: { margin: Spacing.base, padding: 0, overflow: 'hidden' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    gap: Spacing.md,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: FontSize.base, fontWeight: FontWeight.medium },
  divider: { height: 1, marginLeft: Spacing.base + 22 + Spacing.md },
  logoutWrap: { paddingHorizontal: Spacing.base, marginBottom: Spacing.md },
  version: { textAlign: 'center', fontSize: FontSize.xs, marginTop: Spacing.sm },
});
