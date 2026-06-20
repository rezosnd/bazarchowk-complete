import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://bazarchowkapi.veritasco.tech';

export default function ShopLocationScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  const [shopId, setShopId] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');

  useEffect(() => {
    fetchShopAndLocation();
  }, []);

  const fetchShopAndLocation = async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('partner_token');
      if (token) {
        const res = await fetch(`${API_URL}/shops/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setShopId(data.id);
          setAddress(data.address || '');
          setCity(data.city || '');
          setStateName(data.state || '');
          if (data.latitude) setLatitude(data.latitude.toString());
          if (data.longitude) setLongitude(data.longitude.toString());
        }
      }
    } catch (e) {
      console.warn('Could not fetch shop profile', e);
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access location was denied. Please enter coordinates manually.');
      setLoading(false);
      return;
    }

    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (!latitude && !longitude) {
        setLatitude(loc.coords.latitude.toString());
        setLongitude(loc.coords.longitude.toString());
      }
    } catch (e) {
      console.warn('GPS Error', e);
    }
    
    setLoading(false);
  };

  const handleSave = async () => {
    if (!address || !city || !stateName || !latitude || !longitude) {
      alert('Please fill all details including exact Latitude and Longitude');
      return;
    }
    if (!shopId) {
      alert('Could not find your shop profile. Please try restarting the app.');
      return;
    }

    setSaving(true);
    try {
      const token = await SecureStore.getItemAsync('partner_token');
      const res = await fetch(`${API_URL}/shops/${shopId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          address,
          city,
          state: stateName,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
        }),
      });

      if (!res.ok) throw new Error('Failed to update shop location');
      
      alert('Shop Location updated successfully!');
      router.back();
    } catch (e: any) {
      alert(e.message || 'Error saving location');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Set Shop Location</Text>
      </View>

      {/* Interactive Map Area */}
      <View style={styles.mapContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#00B140" />
        ) : (
          <View style={styles.mapPlaceholder}>
            <Ionicons name="location" size={64} color="#00B140" />
            <Text style={styles.mapText}>Mapbox Location Details</Text>
            {latitude !== '' && longitude !== '' && (
              <Text style={styles.coords}>
                Lat: {parseFloat(latitude).toFixed(6)}, Lng: {parseFloat(longitude).toFixed(6)}
              </Text>
            )}
            <TouchableOpacity style={styles.recenterBtn} onPress={fetchShopAndLocation}>
              <Ionicons name="locate" size={20} color="#00B140" />
              <Text style={styles.recenterText}>Fetch GPS</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Address Form */}
      <View style={[styles.bottomSheet, { paddingBottom: insets.bottom || 24 }]}>
        <Text style={styles.formTitle}>Confirm Address Details</Text>
        
        <View style={styles.inputWrap}>
          <Text style={styles.label}>Shop Address Line 1</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Shop no, Building, Street" 
            value={address}
            onChangeText={setAddress}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputWrap, { flex: 1 }]}>
            <Text style={styles.label}>City</Text>
            <TextInput 
              style={styles.input} 
              placeholder="City" 
              value={city}
              onChangeText={setCity}
            />
          </View>
          <View style={[styles.inputWrap, { flex: 1 }]}>
            <Text style={styles.label}>State</Text>
            <TextInput 
              style={styles.input} 
              placeholder="State" 
              value={stateName}
              onChangeText={setStateName}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputWrap, { flex: 1 }]}>
            <Text style={styles.label}>Latitude *</Text>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. 25.5941" 
              keyboardType="numeric"
              value={latitude}
              onChangeText={setLatitude}
            />
          </View>
          <View style={[styles.inputWrap, { flex: 1 }]}>
            <Text style={styles.label}>Longitude *</Text>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. 85.1376" 
              keyboardType="numeric"
              value={longitude}
              onChangeText={setLongitude}
            />
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.saveBtn, (!latitude || !longitude || !address) && { opacity: 0.5 }]} 
          onPress={handleSave}
          disabled={saving || !latitude || !longitude || !address}
        >
          {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Confirm Location</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 18, fontWeight: '700', color: '#0F172A',
    marginRight: 40,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapText: {
    marginTop: 12, fontSize: 16, fontWeight: '600', color: '#334155',
  },
  coords: {
    marginTop: 4, fontSize: 13, color: '#64748B', fontFamily: 'monospace',
  },
  recenterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 16, backgroundColor: '#FFF',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  recenterText: { color: '#00B140', fontWeight: '600' },
  
  bottomSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.05, shadowRadius: 20, elevation: 20,
  },
  formTitle: {
    fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 20,
  },
  row: { flexDirection: 'row', gap: 12 },
  inputWrap: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 6, textTransform: 'uppercase' },
  input: {
    height: 52, backgroundColor: '#F8FAFC',
    borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 12, paddingHorizontal: 16,
    fontSize: 15, color: '#0F172A',
  },
  saveBtn: {
    height: 56, backgroundColor: '#00B140',
    borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#00B140', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
