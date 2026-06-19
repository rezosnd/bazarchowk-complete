import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Location from 'expo-location';

export default function ShopLocationScreen() {
  const insets = useSafeAreaInsets();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');

  useEffect(() => {
    fetchLocation();
  }, []);

  const fetchLocation = async () => {
    setLoading(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access location was denied');
      setLoading(false);
      return;
    }

    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    setLocation(loc);
    
    // In production, we would reverse geocode here
    // const [geo] = await Location.reverseGeocodeAsync(loc.coords);
    // setAddress(geo.name || '');
    // setCity(geo.city || '');
    // setStateName(geo.region || '');
    
    setLoading(false);
  };

  const handleSave = () => {
    if (!address || !city || !stateName || !location) {
      alert('Please fill all details and ensure GPS is synced');
      return;
    }
    setSaving(true);
    // Simulate backend call to PATCH /shops/:id
    setTimeout(() => {
      setSaving(false);
      alert('Shop Location updated successfully!');
      router.back();
    }, 1000);
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
            <Text style={styles.mapText}>Drop pin on your shop</Text>
            {location && (
              <Text style={styles.coords}>
                Lat: {location.coords.latitude.toFixed(6)}, Lng: {location.coords.longitude.toFixed(6)}
              </Text>
            )}
            <TouchableOpacity style={styles.recenterBtn} onPress={fetchLocation}>
              <Ionicons name="locate" size={20} color="#00B140" />
              <Text style={styles.recenterText}>Recenter</Text>
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

        <TouchableOpacity 
          style={[styles.saveBtn, (!location || !address) && { opacity: 0.5 }]} 
          onPress={handleSave}
          disabled={saving || !location || !address}
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
