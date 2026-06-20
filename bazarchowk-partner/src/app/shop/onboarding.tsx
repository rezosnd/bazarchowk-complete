import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://bazarchowkapi.veritasco.tech';

const PARTNER_TYPES = [
  { id: 'RESTAURANT', label: 'Restaurant / Food', icon: 'restaurant' },
  { id: 'GROCERY', label: 'Kirana / Grocery', icon: 'basket' },
  { id: 'PHARMACY', label: 'Pharmacy', icon: 'medkit' },
  { id: 'SALON', label: 'Salon & Beauty', icon: 'cut' },
  { id: 'PLUMBER', label: 'Plumber', icon: 'water' },
  { id: 'ELECTRICIAN', label: 'Electrician', icon: 'flash' },
  { id: 'AC_REPAIR', label: 'AC Repair', icon: 'snow' },
  { id: 'CARPENTER', label: 'Carpenter', icon: 'hammer' },
  { id: 'CLEANING', label: 'Home Cleaning', icon: 'color-palette' },
  { id: 'TUTOR', label: 'Tutor', icon: 'book' },
  { id: 'MECHANIC', label: 'Mechanic', icon: 'construct' },
  { id: 'OTHER', label: 'Other Services', icon: 'briefcase' },
];

export default function ShopOnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [partnerType, setPartnerType] = useState<string>('');

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [deliveryRadius, setDeliveryRadius] = useState('5');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  const fetchCoordinates = async () => {
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (servicesEnabled) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let loc = await Location.getLastKnownPositionAsync();
          if (!loc) loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
          if (loc) {
            setLatitude(loc.coords.latitude.toString());
            setLongitude(loc.coords.longitude.toString());
            return;
          }
        }
      }
    } catch (e) {
      console.warn('Location fetch failed', e);
    }
  };

  const handleRegister = async () => {
    if (!name || !address || !city || !stateName || !latitude || !longitude) {
      alert('Please fill all mandatory fields (*), including Latitude and Longitude.');
      return;
    }

    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('partner_token');
      if (!token) throw new Error('Authentication token missing. Please log in again.');
      
      const payload = {
        name,
        description,
        address,
        city,
        state: stateName,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        deliveryRadius: parseFloat(deliveryRadius),
        partnerType,
      };

      const res = await fetch(`${API_BASE}/shops`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const newShop = await res.json();
        await SecureStore.setItemAsync('bazar_shop_id', newShop.id);
        
        // Dynamic redirect based on type
        const isService = ['PLUMBER', 'ELECTRICIAN', 'CARPENTER', 'AC_REPAIR', 'CLEANING', 'TUTOR', 'MECHANIC', 'OTHER', 'SALON'].includes(partnerType);
        
        alert('Registered Successfully!');
        if (isService) {
          router.push('/services'); // Push to appointments dashboard
        } else {
          router.push('/'); // Push to store dashboard
        }
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to register shop');
      }
    } catch (e: any) {
      alert(e.message || 'Network Error. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 1) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title}>What's your business?</Text>
          <Text style={styles.subtitle}>Select your partner type</Text>
        </View>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.grid}>
            {PARTNER_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeCard,
                  partnerType === type.id && styles.typeCardActive
                ]}
                onPress={() => setPartnerType(type.id)}
              >
                <View style={[styles.iconWrap, partnerType === type.id && styles.iconWrapActive]}>
                  <Ionicons name={type.icon as any} size={28} color={partnerType === type.id ? '#FFF' : '#059669'} />
                </View>
                <Text style={[styles.typeText, partnerType === type.id && styles.typeTextActive]}>{type.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.btn, !partnerType && { opacity: 0.5 }]} 
            disabled={!partnerType}
            onPress={() => setStep(2)}
          >
            <Text style={styles.btnText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isProfessional = ['PLUMBER', 'ELECTRICIAN', 'CARPENTER', 'AC_REPAIR', 'CLEANING', 'TUTOR', 'MECHANIC', 'OTHER'].includes(partnerType);
  const isSalon = partnerType === 'SALON';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setStep(1)} style={{ marginBottom: 16 }}>
          <Feather name="arrow-left" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Register Details</Text>
        <Text style={styles.subtitle}>Step 2: Business Information</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{isProfessional ? 'Professional Details' : 'Shop Details'}</Text>
          
          <Text style={styles.label}>{isProfessional ? 'Your Full Name *' : 'Business/Shop Name *'}</Text>
          <TextInput style={styles.input} placeholder={isProfessional ? "John Doe" : "Fresh Groceries Mart"} value={name} onChangeText={setName} />

          <Text style={styles.label}>Description & Experience</Text>
          <TextInput 
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
            placeholder={isProfessional ? "Tell customers about your experience..." : "Tell customers about your shop..."} 
            value={description} 
            onChangeText={setDescription}
            multiline
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{isProfessional ? 'Service Area' : 'Location Details'}</Text>
          
          <Text style={styles.label}>{isProfessional ? 'Base Address / Locality *' : 'Street Address *'}</Text>
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

          {!isSalon && (
            <>
              <Text style={styles.label}>{isProfessional ? 'Service Radius (km)' : 'Delivery Radius (km)'}</Text>
              <TextInput 
                style={styles.input} 
                placeholder="5" 
                keyboardType="numeric"
                value={deliveryRadius} 
                onChangeText={setDeliveryRadius} 
              />
            </>
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <Text style={styles.sectionTitle}>Map Coordinates</Text>
            <TouchableOpacity onPress={fetchCoordinates} style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
              <Text style={{ color: '#059669', fontWeight: 'bold', fontSize: 12 }}>Auto Fetch GPS</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Latitude *</Text>
              <TextInput style={styles.input} placeholder="e.g. 25.5941" keyboardType="numeric" value={latitude} onChangeText={setLatitude} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Longitude *</Text>
              <TextInput style={styles.input} placeholder="e.g. 85.1376" keyboardType="numeric" value={longitude} onChangeText={setLongitude} />
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Complete Registration</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 15, color: '#059669', fontWeight: '600', marginTop: 4 },
  scroll: { padding: 20, gap: 20, paddingBottom: 100 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  typeCard: {
    width: (width - 60) / 2,
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2
  },
  typeCardActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  iconWrap: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#ECFDF5',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12
  },
  iconWrapActive: {
    backgroundColor: '#059669',
  },
  typeText: { fontSize: 14, fontWeight: '700', color: '#334155', textAlign: 'center' },
  typeTextActive: { color: '#059669' },
  footer: { padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderColor: '#E2E8F0' },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 8 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#0F172A', marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12 },
  hint: { fontSize: 12, color: '#94A3B8', marginTop: -8, marginBottom: 16 },
  btn: { backgroundColor: '#ea580c', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#ea580c', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
