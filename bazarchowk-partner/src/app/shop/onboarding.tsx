import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export default function ShopOnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [deliveryRadius, setDeliveryRadius] = useState('5');

  const handleRegister = async () => {
    if (!name || !address || !city || !stateName) {
      alert('Please fill all mandatory fields (*)');
      return;
    }

    setLoading(true);
    try {
      // In production, get Bearer token from auth store
      // const token = useAuthStore.getState().token;
      
      const payload = {
        name,
        description,
        address,
        city,
        state: stateName,
        latitude: 25.5941, // Hardcoded for onboarding step, Partner updates later via Location screen
        longitude: 85.1376,
        deliveryRadius: parseFloat(deliveryRadius),
      };

      const res = await fetch(`${API_BASE}/shops`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert('Shop Registered Successfully! Redirecting to Timings...');
        router.push('/shop/timings');
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to register shop');
      }
    } catch (e) {
      alert('Network Error. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Register Your Shop</Text>
        <Text style={styles.subtitle}>Step 1: Basic Information</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Shop Details</Text>
          
          <Text style={styles.label}>Shop Name *</Text>
          <TextInput style={styles.input} placeholder="e.g. Fresh Groceries Mart" value={name} onChangeText={setName} />

          <Text style={styles.label}>Description</Text>
          <TextInput 
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
            placeholder="Tell customers about your shop..." 
            value={description} 
            onChangeText={setDescription}
            multiline
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Location Details</Text>
          
          <Text style={styles.label}>Street Address *</Text>
          <TextInput style={styles.input} placeholder="Shop No, Building, Street" value={address} onChangeText={setAddress} />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>City *</Text>
              <TextInput style={styles.input} placeholder="City" value={city} onChangeText={setCity} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>State *</Text>
              <TextInput style={styles.input} placeholder="State" value={stateName} onChangeText={setStateName} />
            </View>
          </View>

          <Text style={styles.label}>Delivery Radius (km)</Text>
          <TextInput 
            style={styles.input} 
            placeholder="5" 
            keyboardType="numeric"
            value={deliveryRadius} 
            onChangeText={setDeliveryRadius} 
          />
          <Text style={styles.hint}>Customers outside this radius won't see your shop.</Text>
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Register Shop</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  title: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 14, color: '#00B140', fontWeight: '600', marginTop: 4 },
  scroll: { padding: 20, gap: 20, paddingBottom: 100 },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 8 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#0F172A', marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12 },
  hint: { fontSize: 12, color: '#94A3B8', marginTop: -8, marginBottom: 16 },
  btn: { backgroundColor: '#00B140', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#00B140', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
