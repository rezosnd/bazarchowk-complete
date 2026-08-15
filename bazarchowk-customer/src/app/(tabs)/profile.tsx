import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Linking, Modal, TextInput } from 'react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks';
import { FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '@/theme';
import { Button, Card } from '@/components/ui';
import { useAuthStore } from '@/store';

import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import api from '@/services/api';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  const MENU_ITEMS = [
    { id: 'orders', icon: 'receipt-outline', label: 'My Orders' },
    { id: 'appointments', icon: 'calendar-outline', label: 'My Appointments' },
    { id: 'addresses', icon: 'location-outline', label: t('profile.savedAddresses') },
    { id: 'wallet', icon: 'wallet-outline', label: 'BazarChowk Wallet' },
    { id: 'my-reviews', icon: 'star-outline', label: 'My Reviews' },
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
      <View style={[styles.userCardWrapper, { shadowColor: theme.primary }]}>
        <LinearGradient colors={['#00B140', '#059669']} style={styles.userCardGradient}>
          {isAuthenticated && user ? (
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.firstName?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.userName}>
                    {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User'}
                  </Text>
                  <Ionicons name="checkmark-circle" size={16} color="#DCFCE7" />
                </View>
                {user?.phone && <Text style={styles.userPhone}>{user.phone}</Text>}
                {user?.email && (
                  <Text style={styles.userEmail}>{user.email}</Text>
                )}
                <TouchableOpacity onPress={() => {
                  setEditFirstName(user?.firstName || '');
                  setEditLastName(user?.lastName || '');
                  setEditPhone(user?.phone || '');
                  setIsEditModalVisible(true);
                }} style={styles.editBtn}>
                  <Text style={styles.editBtnText}>Edit Profile</Text>
                  <Ionicons name="pencil" size={12} color="#FFF" />
                </TouchableOpacity>
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
        </LinearGradient>
      </View>

      {/* Menu Items */}
      <Card style={styles.menuCard}>
        {MENU_ITEMS.map((item, index) => (
          <View key={item.id}>
            <TouchableOpacity 
              style={styles.menuItem} 
              activeOpacity={0.7}
              onPress={() => {
                if (item.id === 'orders') router.push('/orders' as any);
                if (item.id === 'appointments') router.push('/appointments');
                if (item.id === 'addresses') router.push('/addresses');
                if (item.id === 'wallet') router.push('/wallet' as any);
                if (item.id === 'my-reviews') router.push('/my-reviews' as any);
                if (item.id === 'support') router.push('/support' as any);
                if (item.id === 'about') Linking.openURL('https://bazarchowk.com/about');
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

      <Modal visible={isEditModalVisible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: insets.bottom + 24 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>Edit Profile</Text>
            
            <Text style={{ color: '#64748B', marginBottom: 4 }}>First Name</Text>
            <TextInput style={styles.input} value={editFirstName} onChangeText={setEditFirstName} />
            
            <Text style={{ color: '#64748B', marginBottom: 4, marginTop: 12 }}>Last Name</Text>
            <TextInput style={styles.input} value={editLastName} onChangeText={setEditLastName} />
            
            <Text style={{ color: '#64748B', marginBottom: 4, marginTop: 12 }}>Mobile Number</Text>
            <TextInput style={styles.input} value={editPhone} onChangeText={setEditPhone} keyboardType="phone-pad" />
            
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
              <View style={{ flex: 1 }}><Button title="Cancel" variant="outline" onPress={() => setIsEditModalVisible(false)} /></View>
              <View style={{ flex: 1 }}><Button title="Save" onPress={async () => {
                try {
                  const updateData: any = {
                    firstName: editFirstName.trim(),
                    lastName: editLastName.trim(),
                  };
                  if (editPhone.trim() !== '') {
                    updateData.phone = editPhone.trim();
                  }

                  const res = await api.patch('/users/me', updateData);
                  // Update Zustand store so UI reflects changes instantly
                  useAuthStore.getState().setUser(res.data);
                  setIsEditModalVisible(false);
                  alert('Profile updated and saved to database successfully!');
                } catch (error) {
                  alert('Failed to update profile in database');
                }
              }} /></View>
            </View>
          </View>
        </View>
      </Modal>
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
  userCardWrapper: {
    margin: Spacing.base,
    borderRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
  },
  userCardGradient: {
    padding: Spacing.lg,
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#DCFCE7',
  },
  avatarText: { fontSize: FontSize['3xl'], fontWeight: '900', color: '#00B140' },
  userName: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  userPhone: { fontSize: FontSize.sm, marginTop: 4, color: 'rgba(255,255,255,0.9)' },
  userEmail: { fontSize: FontSize.xs, marginTop: 2, color: 'rgba(255,255,255,0.7)' },
  editBtn: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
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
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 16,
    color: '#0F172A',
  }
});
