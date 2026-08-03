import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://bazarchowk-complete.vercel.app';

export default function ShopProfileScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [shopId, setShopId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = await SecureStore.getItemAsync('partner_token');
      if (!token) throw new Error('Authentication token missing.');
      
      const res = await fetch(`${API_BASE}/shops/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setShopId(data.id);
        setName(data.name || '');
        setDescription(data.description || '');
        setLogoUrl(data.logoUrl || '');
        setBannerUrl(data.bannerUrl || '');
      } else {
        alert('Failed to load shop profile');
      }
    } catch (error) {
      console.warn('Failed to fetch profile', error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (type: 'logo' | 'banner') => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: type === 'logo' ? [1, 1] : [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setUploading(true);
      try {
        const token = await SecureStore.getItemAsync('partner_token');
        if (!token) throw new Error('Missing auth token');

        const formData = new FormData();
        formData.append('file', {
          uri: asset.uri,
          name: asset.fileName || 'upload.jpg',
          type: asset.mimeType || 'image/jpeg',
        } as any);
        formData.append('folder', 'shops');

        const uploadRes = await fetch(`${API_BASE}/upload`, {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        });

        if (uploadRes.ok) {
          const data = await uploadRes.json();
          const uploadedUrl = data.url || data.secure_url;
          if (type === 'logo') setLogoUrl(uploadedUrl);
          else setBannerUrl(uploadedUrl);
        } else {
          const errText = await uploadRes.text();
          console.error(errText);
          alert('Failed to upload image. Backend returned an error.');
        }
      } catch (err: any) {
        console.error(err?.response?.data || err.message);
        alert('Network error while uploading');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleSave = async () => {
    if (!name) {
      alert('Shop Name is required');
      return;
    }
    setSaving(true);
    try {
      const token = await SecureStore.getItemAsync('partner_token');
      const res = await fetch(`${API_BASE}/shops/${shopId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, description, logoUrl, bannerUrl }),
      });

      if (res.ok) {
        alert('Profile updated successfully!');
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to update profile');
      }
    } catch (e: any) {
      alert(e.message || 'Network Error.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#00B140" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shop Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* Banner Preview */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Branding Images</Text>
          <Text style={styles.label}>Banner Image</Text>
          <TouchableOpacity onPress={() => pickImage('banner')} disabled={uploading}>
            {bannerUrl ? (
              <Image source={{ uri: bannerUrl }} style={styles.bannerPreview} resizeMode="cover" />
            ) : (
              <View style={[styles.bannerPreview, styles.placeholder]}>
                <Ionicons name="image-outline" size={24} color="#94A3B8" />
                <Text style={styles.placeholderText}>Tap to Upload Banner</Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={[styles.label, { marginTop: 16 }]}>Logo Image</Text>
          <TouchableOpacity onPress={() => pickImage('logo')} disabled={uploading}>
            {logoUrl ? (
              <Image source={{ uri: logoUrl }} style={styles.logoPreview} resizeMode="cover" />
            ) : (
              <View style={[styles.logoPreview, styles.placeholder]}>
                <Ionicons name="image-outline" size={20} color="#94A3B8" />
                <Text style={styles.placeholderText}>Tap to Upload Logo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Basic Details</Text>
          
          <Text style={styles.label}>Shop Name *</Text>
          <TextInput style={styles.input} placeholder="Shop Name" value={name} onChangeText={setName} />

          <Text style={styles.label}>Description</Text>
          <TextInput 
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
            placeholder="Tell customers about your shop..." 
            value={description} 
            onChangeText={setDescription}
            multiline
          />
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleSave} disabled={saving || uploading}>
          {saving || uploading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Save Profile</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16,
    backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E2E8F0',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#0F172A', marginLeft: 8 },
  scroll: { padding: 20, gap: 20, paddingBottom: 100 },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 8 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#0F172A', marginBottom: 16 },
  bannerPreview: { width: '100%', height: 120, borderRadius: 12, backgroundColor: '#F1F5F9' },
  logoPreview: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F1F5F9', marginTop: 8 },
  placeholder: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  placeholderText: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  btn: { backgroundColor: '#00B140', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#00B140', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
