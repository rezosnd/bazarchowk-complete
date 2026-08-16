import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, Linking, Modal, TextInput } from 'react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/store';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import api from '@/services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { Header } from '@/components/Header';
import { PressableScale } from '@/components/PressableScale';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  const SECTIONS = [
    {
      title: 'Account',
      items: [
        { id: 'edit-profile', icon: 'person-outline', label: 'Personal Information' },
        { id: 'addresses', icon: 'location-outline', label: t('profile.savedAddresses') },
        { id: 'language', icon: 'language-outline', label: 'Language' },
      ]
    },
    {
      title: 'Orders & Payments',
      items: [
        { id: 'orders', icon: 'receipt-outline', label: 'My Orders' },
        { id: 'wallet', icon: 'wallet-outline', label: 'BazarChowk Wallet' },
        { id: 'appointments', icon: 'calendar-outline', label: 'My Appointments' },
      ]
    },
    {
      title: 'Support',
      items: [
        { id: 'support', icon: 'headset-outline', label: 'Help & Support' },
        { id: 'about', icon: 'information-circle-outline', label: 'About BazarChowk' },
      ]
    },
    {
      title: 'Other',
      items: [
        { id: 'notifications', icon: 'notifications-outline', label: t('profile.notifications') },
        { id: 'privacy', icon: 'shield-checkmark-outline', label: 'Privacy Policy' },
        { id: 'terms', icon: 'document-text-outline', label: 'Terms & Conditions' },
      ]
    }
  ];

  const handleMenuPress = (id: string) => {
    switch (id) {
      case 'edit-profile':
        setEditFirstName(user?.firstName || '');
        setEditLastName(user?.lastName || '');
        setEditPhone(user?.phone || '');
        setIsEditModalVisible(true);
        break;
      case 'orders': router.push('/orders' as any); break;
      case 'appointments': router.push('/appointments' as any); break;
      case 'addresses': router.push('/addresses' as any); break;
      case 'wallet': router.push('/wallet' as any); break;
      case 'notifications': router.push('/notifications' as any); break;
      case 'support': router.push('/support' as any); break;
      case 'about': Linking.openURL('https://bazarchowk.com/about'); break;
      case 'privacy': Linking.openURL('https://bazarchowk.com/privacy'); break;
      case 'terms': Linking.openURL('https://bazarchowk.com/terms'); break;
      default: break;
    }
  };

  return (
    <View style={styles.root}>
      <Header title="My Profile" showBack={false} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.springify().damping(18)} style={styles.userCardWrapper}>
          <LinearGradient colors={['#00B140', '#008F3C']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={styles.userCardGradient}>
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
                    <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                  </View>
                  {user?.phone && <Text style={styles.userPhone}>{user.phone}</Text>}
                  {user?.email && <Text style={styles.userEmail}>{user.email}</Text>}
                </View>
                <PressableScale onPress={() => handleMenuPress('edit-profile')} style={styles.editIconBtn}>
                  <Ionicons name="pencil" size={18} color="#00B140" />
                </PressableScale>
              </View>
            ) : (
              <View style={styles.guestInfo}>
                <Image
                  source={require('@/assets/images/APP-ICON.png')}
                  style={styles.guestLogo}
                  contentFit="contain"
                />
                <Text style={styles.guestTitle}>{t('profile.join')}</Text>
                <Text style={styles.guestSubtitle}>{t('profile.signInSubtitle')}</Text>
                <Button
                  title={t('profile.signInButton')}
                  onPress={() => router.push('/(auth)/login')}
                  style={{ backgroundColor: '#122018' }}
                />
              </View>
            )}
          </LinearGradient>
        </Animated.View>

        {SECTIONS.map((section, sIdx) => (
          <Animated.View key={section.title} entering={FadeInDown.delay(sIdx * 50).springify().damping(15)} style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.menuCard}>
              {section.items.map((item, index) => (
                <View key={item.id}>
                  <PressableScale 
                    style={styles.menuItem}
                    onPress={() => handleMenuPress(item.id)}
                  >
                    <View style={styles.menuIconWrap}>
                      <Ionicons name={item.icon as any} size={22} color="#122018" />
                    </View>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    <Ionicons name="chevron-forward" size={20} color="#8B9690" />
                  </PressableScale>
                  {index < section.items.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          </Animated.View>
        ))}

        {isAuthenticated && (
          <Animated.View entering={FadeInDown.delay(300).springify().damping(15)} style={styles.logoutWrap}>
            <PressableScale style={styles.logoutBtn} onPress={logout}>
              <Ionicons name="log-out-outline" size={20} color="#DC2626" />
              <Text style={styles.logoutText}>{t('profile.logout')}</Text>
            </PressableScale>
          </Animated.View>
        )}

        <Text style={styles.version}>BazarChowk v1.0.0</Text>

        <Modal visible={isEditModalVisible} animationType="slide" transparent>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Math.max(insets.bottom, 24) }}>
              <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: 16, color: '#122018' }}>Edit Profile</Text>
              
              <Text style={styles.modalLabel}>First Name</Text>
              <TextInput style={styles.input} value={editFirstName} onChangeText={setEditFirstName} />
              
              <Text style={styles.modalLabel}>Last Name</Text>
              <TextInput style={styles.input} value={editLastName} onChangeText={setEditLastName} />
              
              <Text style={styles.modalLabel}>Mobile Number</Text>
              <TextInput style={styles.input} value={editPhone} onChangeText={setEditPhone} keyboardType="phone-pad" />
              
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
                <View style={{ flex: 1 }}>
                  <Button title="Cancel" variant="outline" onPress={() => setIsEditModalVisible(false)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button title="Save" onPress={async () => {
                    try {
                      const updateData: any = {
                        firstName: editFirstName.trim(),
                        lastName: editLastName.trim(),
                      };
                      if (editPhone.trim() !== '') updateData.phone = editPhone.trim();

                      const res = await api.patch('/users/me', updateData);
                      useAuthStore.getState().setUser(res.data);
                      setIsEditModalVisible(false);
                    } catch (error) {
                      console.error('Failed to update profile');
                    }
                  }} />
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7FBF8' },
  userCardWrapper: {
    margin: 16,
    borderRadius: 24,
    shadowColor: '#00B140',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
  },
  userCardGradient: { padding: 20 },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#EAF8F0',
  },
  avatarText: { fontSize: 24, fontWeight: '900', color: '#00B140' },
  userName: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  userPhone: { fontSize: 14, marginTop: 4, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  userEmail: { fontSize: 13, marginTop: 2, color: 'rgba(255,255,255,0.7)' },
  editIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4
  },
  
  guestInfo: { alignItems: 'center', gap: 16, padding: 16 },
  guestLogo: { width: 72, height: 72, borderRadius: 20 },
  guestTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  guestSubtitle: { fontSize: 14, textAlign: 'center', color: 'rgba(255,255,255,0.9)', marginBottom: 8 },

  sectionContainer: { marginTop: 16, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#66736B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, paddingHorizontal: 4 },
  
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1, borderColor: '#E5EBE7',
    shadowColor: '#00B140', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2,
    overflow: 'hidden'
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, height: 64, gap: 16,
  },
  menuIconWrap: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: '#F7FBF8', alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: '#122018' },
  divider: { height: 1, marginLeft: 72, backgroundColor: '#F0F5F2' },
  
  logoutWrap: { paddingHorizontal: 16, marginTop: 32 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 16, height: 56, borderWidth: 1, borderColor: '#FEE2E2'
  },
  logoutText: { color: '#DC2626', fontSize: 16, fontWeight: '700' },
  
  version: { textAlign: 'center', fontSize: 12, color: '#8B9690', marginTop: 32 },
  
  modalLabel: { color: '#66736B', marginBottom: 6, marginTop: 16, fontSize: 13, fontWeight: '600' },
  input: {
    borderWidth: 1, borderColor: '#E5EBE7', borderRadius: 16,
    paddingHorizontal: 16, height: 52, fontSize: 16, color: '#122018',
    backgroundColor: '#F7FBF8'
  }
});
