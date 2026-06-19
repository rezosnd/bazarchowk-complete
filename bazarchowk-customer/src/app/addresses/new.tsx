import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks';
import { FontSize, FontWeight, Spacing } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAddAddress } from '@/hooks';
import { Button, Input } from '@/components/ui';
import * as Location from 'expo-location';

export default function AddAddressScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const addMutation = useAddAddress();

  const [title, setTitle] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const fetchLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      setLatitude(location.coords.latitude);
      setLongitude(location.coords.longitude);
    } catch (error) {
      console.warn('Error fetching location:', error);
    } finally {
      setLocationLoading(false);
    }
  };

  useEffect(() => {
    fetchLocation();
  }, []);

  const handleSave = () => {
    if (!title || !addressLine1 || !city || !state || !pincode || !latitude || !longitude) {
      alert('Please fill all required fields and wait for location to sync.');
      return;
    }

    addMutation.mutate(
      {
        title,
        addressLine1,
        addressLine2,
        city,
        state,
        pincode,
        latitude,
        longitude,
        isDefault: true,
      },
      {
        onSuccess: () => {
          router.back();
        },
        onError: () => {
          alert('Failed to add address');
        }
      }
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Add New Address</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* GPS Location Banner */}
        <View style={[styles.locationBanner, { backgroundColor: theme.primarySurface }]}>
          <Ionicons name="location" size={24} color={theme.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.locationTitle, { color: theme.primary }]}>GPS Coordinates</Text>
            {locationLoading ? (
              <Text style={{ color: theme.primary, fontSize: 12 }}>Fetching current location...</Text>
            ) : latitude && longitude ? (
              <Text style={{ color: theme.primary, fontSize: 12 }}>
                Lat: {latitude.toFixed(4)}, Lng: {longitude.toFixed(4)}
              </Text>
            ) : (
              <Text style={{ color: theme.error, fontSize: 12 }}>Location not synced</Text>
            )}
          </View>
          <TouchableOpacity onPress={fetchLocation} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={20} color={theme.primary} />
          </TouchableOpacity>
        </View>

        <Input label="Address Title" placeholder="Home, Office, etc." value={title} onChangeText={setTitle} required />
        <Input label="Address Line 1" placeholder="House/Flat No., Building Name" value={addressLine1} onChangeText={setAddressLine1} required />
        <Input label="Address Line 2 (Optional)" placeholder="Street, Area" value={addressLine2} onChangeText={setAddressLine2} />
        
        <View style={{ flexDirection: 'row', gap: Spacing.md }}>
          <View style={{ flex: 1 }}>
            <Input label="City" placeholder="City" value={city} onChangeText={setCity} required />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="State" placeholder="State" value={state} onChangeText={setState} required />
          </View>
        </View>

        <Input label="Pincode" placeholder="6-digit Pincode" value={pincode} onChangeText={setPincode} keyboardType="number-pad" maxLength={6} required />

      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom || Spacing.lg, backgroundColor: theme.surface }]}>
        <Button
          title="Save Address"
          onPress={handleSave}
          loading={addMutation.isPending}
          disabled={!latitude || !longitude}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: { padding: Spacing.xs, marginRight: Spacing.sm },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  content: { padding: Spacing.base, gap: Spacing.md },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: 12,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  locationTitle: { fontWeight: 'bold', fontSize: FontSize.sm },
  refreshBtn: { padding: Spacing.xs },
  footer: {
    padding: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 10,
  },
});
