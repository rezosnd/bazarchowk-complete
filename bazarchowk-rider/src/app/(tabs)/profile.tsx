import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, TextInput, Image, Modal, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://bazarchowk-complete.vercel.app';

export default function RiderProfileScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [upiId, setUpiId] = useState('');
  const [editingUpi, setEditingUpi] = useState(false);
  const [savingUpi, setSavingUpi] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Market selection modal state
  const [showMarketModal, setShowMarketModal] = useState(params.autoOpenMarket === 'true');
  const [markets, setMarkets] = useState<any[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(false);
  const [savingMarket, setSavingMarket] = useState(false);
  const [currentMarketName, setCurrentMarketName] = useState<string>('');

  const [riderStatus, setRiderStatus] = useState<'approved' | 'pending' | 'no_market'>('pending');

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const token = await SecureStore.getItemAsync('rider_token');
      const res = await fetch(`${API_BASE}/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setEditPhone(data.phone || '');
      }

      // Fetch delivery partner profile for market info
      const riderRes = await fetch(`${API_BASE}/delivery/rider/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (riderRes.ok) {
        const riderData = await riderRes.json();
        if (riderData?.market?.name) {
          setCurrentMarketName(riderData.market.name);
          setRiderStatus('approved');
        } else if (riderData?.marketId) {
          setRiderStatus('pending'); // has market but maybe not approved
        } else {
          setRiderStatus('no_market'); // no market selected at all
        }
      } else {
        setRiderStatus('no_market');
      }
    } catch (error) {
      console.warn('Failed to fetch profile');
    } finally {
      const storedUpi = await SecureStore.getItemAsync('rider_upi_id');
      if (storedUpi) setUpiId(storedUpi);
      setLoading(false);
    }
  };

  const fetchMarkets = async () => {
    setLoadingMarkets(true);
    try {
      const token = await SecureStore.getItemAsync('rider_token');
      const res = await fetch(`${API_BASE}/super-admin/markets?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMarkets(data.data || data || []);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not load markets. Please try again.');
    } finally {
      setLoadingMarkets(false);
    }
  };

  const handleOpenMarketModal = () => {
    setShowMarketModal(true);
    fetchMarkets();
  };

  const handleSelectMarket = async (market: any) => {
    setSavingMarket(true);
    try {
      const token = await SecureStore.getItemAsync('rider_token');
      const res = await fetch(`${API_BASE}/delivery/rider/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ marketId: market.id })
      });
      if (res.ok) {
        setCurrentMarketName(market.name);
        setShowMarketModal(false);
        Alert.alert('✅ Market Updated', `You are now operating in "${market.name}". Orders from this zone will be assigned to you.`);
      } else {
        const err = await res.json();
        Alert.alert('Error', err?.message || 'Failed to update market. Please try again.');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not connect to server.');
    } finally {
      setSavingMarket(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editPhone.trim()) {
      Alert.alert('Error', 'Phone number cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      const token = await SecureStore.getItemAsync('rider_token');
      const res = await fetch(`${API_BASE}/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ phone: editPhone })
      });
      if (res.ok) {
        Alert.alert('Success', 'Profile updated successfully.');
        fetchProfile();
        setEditing(false);
      } else {
        Alert.alert('Error', 'Failed to update profile.');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not connect to server.');
    } finally {
      setSaving(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        uploadImage(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadImage = async (uri: string) => {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', { uri, name: 'avatar.jpg', type: 'image/jpeg' } as any);
      formData.append('folder', 'profiles');
      const uploadRes = await axios.post(`${API_BASE}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const imageUrl = uploadRes.data.url || uploadRes.data.secure_url;
      const token = await SecureStore.getItemAsync('rider_token');
      const updateRes = await fetch(`${API_BASE}/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ avatarUrl: imageUrl })
      });
      if (updateRes.ok) {
        fetchProfile();
        Alert.alert('Success', 'Profile picture updated');
      } else {
        throw new Error('Failed to save profile picture');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveUpi = async () => {
    setSavingUpi(true);
    try {
      await SecureStore.setItemAsync('rider_upi_id', upiId.trim());
      Alert.alert('Success', 'UPI ID saved locally for customer payments.');
      setEditingUpi(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to save UPI ID.');
    } finally {
      setSavingUpi(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await SecureStore.deleteItemAsync('rider_token');
          await SecureStore.deleteItemAsync('rider_refresh_token');
          router.replace('/(auth)/login');
        }
      }
    ]);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#00B140" size="large" /></View>;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>My Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <TouchableOpacity onPress={handlePickImage} disabled={uploadingImage} style={styles.avatar}>
            {uploadingImage ? (
              <ActivityIndicator color="#0F172A" />
            ) : profile?.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={{ width: '100%', height: '100%', borderRadius: 40 }} />
            ) : (
              <Text style={styles.avatarText}>{profile?.firstName?.[0] || 'R'}</Text>
            )}
            <View style={styles.editAvatarBadge}>
              <Ionicons name="camera" size={12} color="#FFF" />
            </View>
          </TouchableOpacity>
          <View style={styles.info}>
            <Text style={styles.name}>{profile?.firstName} {profile?.lastName}</Text>
            {editing ? (
              <View style={styles.editRow}>
                <TextInput style={styles.input} value={editPhone} onChangeText={setEditPhone} placeholder="Enter Phone Number" keyboardType="phone-pad" />
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile} disabled={saving}>
                  {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.phone}>{profile?.phone || 'No phone number'}</Text>
                <TouchableOpacity onPress={() => setEditing(true)} style={{ marginLeft: 8 }}>
                  <Ionicons name="pencil" size={16} color="#00B140" />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Verified Rider</Text>
            </View>
          </View>
        </View>

        {/* UPI Card */}
        <View style={[styles.profileCard, { paddingVertical: 16 }]}>
          <View style={[styles.avatar, { width: 48, height: 48, backgroundColor: '#E0E7FF' }]}>
            <Ionicons name="qr-code" size={24} color="#4338CA" />
          </View>
          <View style={styles.info}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 4 }}>My UPI ID (For COD Settlement)</Text>
            {editingUpi ? (
              <View style={styles.editRow}>
                <TextInput style={styles.input} value={upiId} onChangeText={setUpiId} placeholder="e.g. yourname@upi" autoCapitalize="none" />
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveUpi} disabled={savingUpi}>
                  {savingUpi ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingUpi(false)}>
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: '#64748B' }}>{upiId || 'Not set'}</Text>
                <TouchableOpacity onPress={() => setEditingUpi(true)} style={{ marginLeft: 8 }}>
                  <Ionicons name="pencil" size={16} color="#00B140" />
                </TouchableOpacity>
              </View>
            )}
            <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 8 }}>Customer payments scan will go directly to this UPI ID.</Text>
          </View>
        </View>

        {/* Current Market Banner — always shown */}
        {currentMarketName ? (
          <View style={styles.marketBanner}>
            <Ionicons name="location" size={20} color="#00B140" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>Operating Market</Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>{currentMarketName}</Text>
            </View>
            <TouchableOpacity onPress={handleOpenMarketModal} style={styles.changeBtn}>
              <Text style={styles.changeBtnText}>Change</Text>
            </TouchableOpacity>
          </View>
        ) : riderStatus === 'pending' ? (
          <View style={[styles.marketBanner, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
            <Ionicons name="time" size={20} color="#D97706" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#B45309' }}>Awaiting Market Assignment</Text>
              <Text style={{ fontSize: 12, color: '#D97706', marginTop: 2 }}>Admin will assign you to a market. You'll be notified once approved.</Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.marketBanner, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}
            onPress={handleOpenMarketModal}
          >
            <Ionicons name="location-outline" size={20} color="#DC2626" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#DC2626' }}>No Market Selected</Text>
              <Text style={{ fontSize: 12, color: '#EF4444', marginTop: 2 }}>Tap to select your operating market to receive orders.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#DC2626" />
          </TouchableOpacity>
        )}

        {/* Menu Section */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.menuItem} onPress={handleOpenMarketModal}>
            <View style={[styles.menuIcon, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="location-outline" size={22} color="#00B140" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuText}>Change Operating Market</Text>
              <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                {currentMarketName ? `Currently: ${currentMarketName}` : 'No market selected'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/earnings')}>
            <View style={[styles.menuIcon, { backgroundColor: '#FFF7ED' }]}>
              <Ionicons name="document-text-outline" size={22} color="#EA580C" />
            </View>
            <Text style={styles.menuText}>Delivery History</Text>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Support', 'Please email support@bazarchowk.com or call 1800-BAZAR-HELP')}>
            <View style={[styles.menuIcon, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="help-buoy-outline" size={22} color="#3B82F6" />
            </View>
            <Text style={styles.menuText}>Support & Help</Text>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ---- Market Selection Modal ---- */}
      <Modal visible={showMarketModal} animationType="slide" transparent onRequestClose={() => setShowMarketModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Your Market</Text>
              <TouchableOpacity onPress={() => setShowMarketModal(false)}>
                <Ionicons name="close-circle" size={28} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Choose the market zone you want to operate in. You'll receive delivery orders only from this area.</Text>

            {loadingMarkets ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <ActivityIndicator size="large" color="#00B140" />
                <Text style={{ color: '#64748B', marginTop: 12 }}>Loading markets...</Text>
              </View>
            ) : markets.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="location-outline" size={48} color="#CBD5E1" />
                <Text style={{ color: '#64748B', marginTop: 12, fontWeight: '600' }}>No markets found</Text>
              </View>
            ) : (
              <FlatList
                data={markets}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 32 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.marketItem, item.name === currentMarketName && styles.marketItemActive]}
                    onPress={() => handleSelectMarket(item)}
                    disabled={savingMarket}
                  >
                    <View style={[styles.marketIcon, { backgroundColor: item.name === currentMarketName ? '#DCFCE7' : '#F8FAFC' }]}>
                      <Ionicons name="storefront-outline" size={22} color={item.name === currentMarketName ? '#00B140' : '#64748B'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.marketItemName, item.name === currentMarketName && { color: '#00B140' }]}>{item.name}</Text>
                      {item.village?.name && (
                        <Text style={styles.marketItemSub}>{item.village.name}</Text>
                      )}
                    </View>
                    {item.name === currentMarketName ? (
                      <Ionicons name="checkmark-circle" size={22} color="#00B140" />
                    ) : savingMarket ? (
                      <ActivityIndicator size="small" color="#00B140" />
                    ) : (
                      <Ionicons name="radio-button-off" size={22} color="#CBD5E1" />
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  title: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  scroll: { padding: 16, gap: 16, paddingBottom: 40 },

  profileCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', gap: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#0F172A' },
  editAvatarBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#00B140', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },
  info: { flex: 1, marginLeft: 16 },
  name: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  phone: { fontSize: 15, color: '#64748B', marginBottom: 8 },
  editRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, fontSize: 14 },
  saveBtn: { backgroundColor: '#00B140', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  cancelBtn: { padding: 4 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#D97706' },

  marketBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#BBF7D0' },
  changeBtn: { backgroundColor: '#00B140', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  changeBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },

  section: { backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  menuIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuText: { flex: 1, fontSize: 16, fontWeight: '600', color: '#334155' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 68 },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FEF2F2', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#FEE2E2' },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#DC2626' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '80%' },
  modalHandle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A' },
  modalSubtitle: { fontSize: 14, color: '#64748B', marginBottom: 24, lineHeight: 20 },
  marketItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 10, backgroundColor: '#FAFAFA', gap: 12 },
  marketItemActive: { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' },
  marketIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  marketItemName: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  marketItemSub: { fontSize: 13, color: '#64748B', marginTop: 2 },
});
