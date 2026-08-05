import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://bazarchowk-complete.vercel.app';

export default function RiderProfileScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [upiId, setUpiId] = useState('');
  const [editingUpi, setEditingUpi] = useState(false);
  const [savingUpi, setSavingUpi] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

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
    } catch (error) {
      console.warn('Failed to fetch profile');
    } finally {
      const storedUpi = await SecureStore.getItemAsync('rider_upi_id');
      if (storedUpi) setUpiId(storedUpi);
      setLoading(false);
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
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile?.firstName?.[0] || 'R'}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{profile?.firstName} {profile?.lastName}</Text>
            
            {editing ? (
              <View style={styles.editRow}>
                <TextInput
                  style={styles.input}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="Enter Phone Number"
                  keyboardType="phone-pad"
                />
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

        <View style={[styles.profileCard, { paddingVertical: 16 }]}>
          <View style={[styles.avatar, { width: 48, height: 48, backgroundColor: '#E0E7FF' }]}>
            <Ionicons name="qr-code" size={24} color="#4338CA" />
          </View>
          <View style={styles.info}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 4 }}>My UPI ID (For COD Settlement)</Text>
            {editingUpi ? (
              <View style={styles.editRow}>
                <TextInput
                  style={styles.input}
                  value={upiId}
                  onChangeText={setUpiId}
                  placeholder="e.g. yourname@upi"
                  autoCapitalize="none"
                />
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

        <View style={styles.section}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/earnings')}>
            <Ionicons name="document-text-outline" size={24} color="#64748B" />
            <Text style={styles.menuText}>Delivery History</Text>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Support', 'Please email support@bazarchowk.com or call 1800-BAZAR-HELP')}>
            <Ionicons name="help-buoy-outline" size={24} color="#64748B" />
            <Text style={styles.menuText}>Support & Help</Text>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  title: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  scroll: { padding: 16, gap: 24 },
  
  profileCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', gap: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#00B140' },
  info: { flex: 1 },
  name: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  phone: { fontSize: 15, color: '#64748B', marginBottom: 8 },
  editRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, fontSize: 14 },
  saveBtn: { backgroundColor: '#00B140', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  cancelBtn: { padding: 4 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#D97706' },

  section: { backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  menuText: { flex: 1, fontSize: 16, fontWeight: '600', color: '#334155' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 52 },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FEF2F2', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#FEE2E2' },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#DC2626' }
});
