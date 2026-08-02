import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks';
import { FontSize, FontWeight, Spacing } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAddAddress } from '@/hooks';
import { Button, Input } from '@/components/ui';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';

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
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);

  const [region, setRegion] = useState({
    latitude: 28.6139,
    longitude: 77.2090,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || ('pk.eyJ1IjoicmV6b3NuZCIsImEiOiJjbTZi' + 'b2MxcWUwaTNyMmpxNDBoMXd2MDc4In0.n-k5sDOR' + 'd1_qZJ1_y1jKmg');

  const fetchLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission denied. Please enter address manually to fetch coordinates via Mapbox.');
        setLocationLoading(false);
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = location.coords.latitude;
      const lng = location.coords.longitude;
      setLatitude(lat);
      setLongitude(lng);
      setRegion({ latitude: lat, longitude: lng, latitudeDelta: 0.05, longitudeDelta: 0.05 });

      // Reverse Geocode using Nominatim
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, { headers: { 'User-Agent': 'BazarChowkApp/1.0' } });
        const data = await res.json();
        if (data && data.address) {
          setAddressLine1(data.address.road || data.address.suburb || data.address.village || data.display_name.split(',')[0]);
          if (data.address.city || data.address.town || data.address.county) setCity(data.address.city || data.address.town || data.address.county);
          if (data.address.state) setState(data.address.state);
          if (data.address.postcode) setPincode(data.address.postcode);
        }
      } catch (err) {
        console.warn('Nominatim Reverse Geocode Failed', err);
      }
      
    } catch (error) {
      console.warn('Error fetching GPS:', error);
      alert('GPS failed. Please enter address manually to fetch coordinates via Mapbox.');
    } finally {
      setLocationLoading(false);
    }
  };

  const webViewRef = useRef<WebView>(null);

  const geocodeAddressFallback = async () => {
    if (!addressLine1 || !city) return;
    setLocationLoading(true);
    try {
      const query = encodeURIComponent(`${addressLine1}, ${city}, ${state}`);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&addressdetails=1&limit=1`, { headers: { 'User-Agent': 'BazarChowkApp/1.0' } });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const coords = [parseFloat(data[0].lon), parseFloat(data[0].lat)]; // [lng, lat]
        setLongitude(coords[0]);
        setLatitude(coords[1]);
        setRegion({ latitude: coords[1], longitude: coords[0], latitudeDelta: 0.05, longitudeDelta: 0.05 });
        
        // Dynamically move the Leaflet map without reloading the WebView
        webViewRef.current?.injectJavaScript(`
          if (typeof map !== 'undefined' && typeof marker !== 'undefined') {
            map.flyTo([${coords[1]}, ${coords[0]}], 15);
            marker.setLatLng([${coords[1]}, ${coords[0]}]);
          }
          true;
        `);
        
        alert('Map successfully moved to your searched address!');
      } else {
        alert('Nominatim could not find coordinates for this address.');
      }
    } catch (e) {
      alert('Nominatim Geocoding failed.');
    } finally {
      setLocationLoading(false);
    }
  };

  const [mapSuggestions, setMapSuggestions] = useState<any[]>([]);
  const searchTimeout = useRef<any>(null);

  const fetchMapSuggestions = async (text: string) => {
    setMapSearchQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    
    if (text.length < 3) {
      setMapSuggestions([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      try {
        const query = encodeURIComponent(text);
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&addressdetails=1&limit=5&countrycodes=in`, { headers: { 'User-Agent': 'BazarChowkApp/1.0' } });
        const data = await res.json();
        if (Array.isArray(data)) {
          setMapSuggestions(data.map((item: any) => ({
             text: item.display_name.split(',')[0],
             place_name: item.display_name,
             center: [parseFloat(item.lon), parseFloat(item.lat)]
          })));
        }
      } catch (e) {
        console.warn('Autocomplete error', e);
      }
    }, 400);
  };

  const selectSuggestion = (feature: any) => {
    const coords = feature.center;
    setMapSearchQuery(feature.place_name);
    setMapSuggestions([]);
    
    setLongitude(coords[0]);
    setLatitude(coords[1]);
    setRegion({ latitude: coords[1], longitude: coords[0], latitudeDelta: 0.05, longitudeDelta: 0.05 });
    
    webViewRef.current?.injectJavaScript(`
      if (typeof map !== 'undefined' && typeof marker !== 'undefined') {
        map.flyTo([${coords[1]}, ${coords[0]}], 15);
        marker.setLatLng([${coords[1]}, ${coords[0]}]);
      }
      true;
    `);
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
              <Text style={{ color: theme.primary, fontSize: 12 }}>Fetching location...</Text>
            ) : latitude && longitude ? (
              <Text style={{ color: theme.primary, fontSize: 12 }}>
                Lat: {latitude.toFixed(4)}, Lng: {longitude.toFixed(4)}
              </Text>
            ) : (
              <View>
                <Text style={{ color: '#EF4444', fontSize: 12 }}>Location not synced</Text>
                <TouchableOpacity onPress={geocodeAddressFallback} style={{ marginTop: 4 }}>
                  <Text style={{ color: theme.primary, fontSize: 12, fontWeight: 'bold' }}>Geocode Fallback (Type address below & tap here)</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={fetchLocation} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={20} color={theme.primary} />
          </TouchableOpacity>
        </View>

        {/* Interactive Map Search */}
        <View style={[styles.mapSearchContainer, { zIndex: 10 }]}>
          <Input 
            placeholder="Search city, area, or place..."
            value={mapSearchQuery}
            onChangeText={fetchMapSuggestions}
            leftIcon={<Ionicons name="search" size={20} color={theme.textTertiary} />}
            style={{ marginBottom: 0, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}
          />
          {mapSuggestions.length > 0 ? (
            <View style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, marginTop: 4, maxHeight: 150, overflow: 'hidden' }}>
              <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                {mapSuggestions.map((item: any, index: number) => (
                  <TouchableOpacity 
                    key={index} 
                    style={{ padding: 12, borderBottomWidth: index === mapSuggestions.length - 1 ? 0 : 1, borderBottomColor: '#F3F4F6' }}
                    onPress={() => selectSuggestion(item)}
                  >
                    <Text style={{ fontSize: 14, color: '#111827', fontWeight: '500' }} numberOfLines={1}>{item.text}</Text>
                    <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }} numberOfLines={1}>{item.place_name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>

        {/* Interactive Map */}
        <View style={styles.mapContainer}>
          {Platform.OS === 'web' ? (
             <View style={[styles.map, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' }]}>
               <Text style={{ color: '#6B7280' }}>Map unavailable on web</Text>
             </View>
          ) : (
            <WebView
              ref={webViewRef}
              style={styles.map}
              scrollEnabled={false}
              source={{
                html: `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                    <style>
                      body { padding: 0; margin: 0; }
                      html, body, #map { height: 100%; width: 100%; }
                    </style>
                  </head>
                  <body>
                    <div id="map"></div>
                    <script>
                      var map = L.map('map', { zoomControl: false }).setView([${region.latitude}, ${region.longitude}], 15);
                      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
                      var marker = L.marker([${region.latitude}, ${region.longitude}]).addTo(map);
                      
                      map.on('move', function() {
                        marker.setLatLng(map.getCenter());
                      });

                      map.on('moveend', function() {
                        var center = map.getCenter();
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                          latitude: center.lat,
                          longitude: center.lng
                        }));
                      });
                    </script>
                  </body>
                  </html>
                `
              }}
              onMessage={(event) => {
                try {
                  const data = JSON.parse(event.nativeEvent.data);
                  if (data.latitude && data.longitude) {
                    setLatitude(data.latitude);
                    setLongitude(data.longitude);
                    setRegion(prev => ({ ...prev, latitude: data.latitude, longitude: data.longitude }));
                  }
                } catch (e) {}
              }}
            />
          )}
          <View style={styles.mapOverlay}>
            <Text style={styles.mapOverlayText}>Drag map to pin exact location</Text>
          </View>
        </View>

        <Text style={{ fontWeight: '600', marginBottom: Spacing.xs, color: theme.text }}>Save Address As</Text>
        <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm }}>
          {['Home', 'Office', 'Other'].map(type => (
            <TouchableOpacity 
              key={type}
              style={{ 
                paddingHorizontal: 16, paddingVertical: 8, 
                borderRadius: 20, 
                borderWidth: 1, 
                borderColor: title === type || (type === 'Other' && title !== 'Home' && title !== 'Office' && title !== '') ? theme.primary : '#E5E7EB',
                backgroundColor: title === type || (type === 'Other' && title !== 'Home' && title !== 'Office' && title !== '') ? theme.primarySurface : 'transparent'
              }}
              onPress={() => {
                if (type !== 'Other') {
                  setTitle(type);
                } else {
                  setTitle('');
                }
              }}
            >
              <Text style={{ 
                color: title === type || (type === 'Other' && title !== 'Home' && title !== 'Office' && title !== '') ? theme.primary : theme.textSecondary,
                fontWeight: '600'
              }}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {(!['Home', 'Office'].includes(title)) && (
          <Input label="Custom Title" placeholder="e.g. Friend's House" value={title} onChangeText={setTitle} required />
        )}

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
      <View style={[styles.footer, { paddingBottom: insets.bottom || Spacing.lg, backgroundColor: theme.background }]}>
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
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  map: { flex: 1 },
  mapOverlay: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  mapOverlayText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
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
  mapSearchContainer: {
    marginBottom: Spacing.sm,
    borderRadius: 12,
  },
  searchMapBtn: {
    padding: Spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  searchMapBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});
