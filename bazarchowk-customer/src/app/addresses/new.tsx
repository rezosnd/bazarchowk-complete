import { Text as AppText } from '@/components/TranslatedText';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Dimensions, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks';
import { FontSize, FontWeight, Spacing } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAddAddress } from '@/hooks';
import { Button, Input } from '@/components/ui';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';

const { height: H } = Dimensions.get('window');

export default function AddAddressScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const addMutation = useAddAddress();

  const [title, setTitle] = useState('Home');
  const [customTitle, setCustomTitle] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [mapSuggestions, setMapSuggestions] = useState<any[]>([]);

  const [region, setRegion] = useState({
    latitude: 28.6139,
    longitude: 77.2090,
  });

  const webViewRef = useRef<WebView>(null);
  const searchTimeout = useRef<any>(null);

  useEffect(() => {
    fetchLocation();
  }, []);

  const fetchLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationLoading(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      updateMapPosition(location.coords.latitude, location.coords.longitude);
      await reverseGeocode(location.coords.latitude, location.coords.longitude);
    } catch (error) {
      console.warn('Error fetching GPS:', error);
    } finally {
      setLocationLoading(false);
    }
  };

  const updateMapPosition = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    setRegion({ latitude: lat, longitude: lng });
    webViewRef.current?.injectJavaScript(`
      if (typeof map !== 'undefined' && typeof marker !== 'undefined') {
        map.flyTo([${lat}, ${lng}], 16);
        marker.setLatLng([${lat}, ${lng}]);
      }
      true;
    `);
  };

  const reverseGeocode = async (lat: number, lng: number) => {
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
      console.warn('Reverse Geocode Failed', err);
    }
  };

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
    updateMapPosition(coords[1], coords[0]);
    reverseGeocode(coords[1], coords[0]);
  };

  const handleSave = () => {
    const finalTitle = title === 'Other' ? customTitle : title;
    if (!finalTitle || !addressLine1 || !city || !state || !pincode || !latitude || !longitude) {
      alert('Please fill all required fields and ensure location is pinned.');
      return;
    }

    addMutation.mutate(
      {
        title: finalTitle,
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
        onSuccess: () => router.back(),
        onError: () => alert('Failed to add address')
      }
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#FFF' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Absolute Map Layer */}
      <View style={[StyleSheet.absoluteFill, { height: H * 0.45 }]}>
        {Platform.OS === 'web' ? (
           <View style={[styles.map, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#EAF8F0' }]}>
             <Ionicons name="map-outline" size={48} color="#8B9690" />
             <AppText style={{ color: '#66736B', marginTop: 12 }}>Map unavailable on web</AppText>
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
                    .center-marker {
                      position: absolute; top: 50%; left: 50%;
                      transform: translate(-50%, -100%);
                      z-index: 1000; pointer-events: none;
                    }
                  </style>
                </head>
                <body>
                  <div id="map"></div>
                  <!-- Center Marker -->
                  <div class="center-marker">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 21.5C12 21.5 20.5 15.5 20.5 9.5C20.5 4.80558 16.6944 1 12 1C7.30558 1 3.5 4.80558 3.5 9.5C3.5 15.5 12 21.5 12 21.5Z" fill="#00B140" stroke="#FFFFFF" stroke-width="2"/>
                      <circle cx="12" cy="9.5" r="3.5" fill="#FFFFFF"/>
                    </svg>
                  </div>
                  <script>
                    var map = L.map('map', { zoomControl: false }).setView([${region.latitude}, ${region.longitude}], 16);
                    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
                    
                    let moveTimeout;
                    map.on('moveend', function() {
                      clearTimeout(moveTimeout);
                      moveTimeout = setTimeout(() => {
                        var center = map.getCenter();
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                          latitude: center.lat,
                          longitude: center.lng
                        }));
                      }, 500);
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
                  reverseGeocode(data.latitude, data.longitude);
                }
              } catch (e) {}
            }}
          />
        )}
      </View>

      {/* Header Overlay */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#122018" />
        </TouchableOpacity>
        <AppText style={styles.title}>Confirm Location</AppText>
      </View>

      {/* Floating Locate Me Button */}
      <View style={[styles.locateBtnWrap, { top: H * 0.45 - 80 }]}>
        <TouchableOpacity style={styles.locateBtn} onPress={fetchLocation}>
          {locationLoading ? (
             <Ionicons name="sync" size={20} color="#00B140" />
          ) : (
             <Ionicons name="locate" size={20} color="#00B140" />
          )}
          <AppText style={styles.locateText}>Use Current Location</AppText>
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet Details */}
      <View style={[styles.bottomSheet, { marginTop: H * 0.45 }]}>
        <View style={styles.dragHandleWrap}>
          <View style={styles.dragHandle} />
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          
          <View style={styles.searchContainer}>
            <Input 
              placeholder="Search for your area..."
              value={mapSearchQuery}
              onChangeText={fetchMapSuggestions}
              containerStyle={styles.searchBoxContainer}
              leftIcon={<Ionicons name="search" size={20} color="#00B140" />}
              style={styles.searchInput}
            />
            
            {mapSuggestions.length > 0 && (
              <View style={styles.suggestionsList}>
                {mapSuggestions.map((item: any, index: number) => (
                  <TouchableOpacity 
                    key={index} 
                    style={[styles.suggestionItem, index === mapSuggestions.length - 1 && { borderBottomWidth: 0 }]}
                    onPress={() => selectSuggestion(item)}
                  >
                    <Ionicons name="location-outline" size={20} color="#66736B" />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <AppText style={styles.suggestionTitle} numberOfLines={1}>{item.text}</AppText>
                      <AppText style={styles.suggestionSub} numberOfLines={1}>{item.place_name}</AppText>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.formSection}>
            <AppText style={styles.sectionTitle}>Address Details</AppText>
            
            <View style={styles.chipRow}>
              {['Home', 'Office', 'Other'].map(type => (
                <TouchableOpacity 
                  key={type}
                  style={[styles.chip, title === type && styles.chipActive]}
                  onPress={() => setTitle(type)}
                >
                  <Ionicons name={type === 'Home' ? 'home' : type === 'Office' ? 'briefcase' : 'location'} size={14} color={title === type ? '#00B140' : '#66736B'} />
                  <AppText style={[styles.chipText, title === type && styles.chipTextActive]}>{type}</AppText>
                </TouchableOpacity>
              ))}
            </View>

            {title === 'Other' && (
              <Input label="Custom Label" placeholder="e.g. Mom's House" value={customTitle} onChangeText={setCustomTitle} required />
            )}

            <Input label="Flat / House No. / Building" placeholder="Enter complete address" value={addressLine1} onChangeText={setAddressLine1} required />
            <Input label="Nearby Landmark (Optional)" placeholder="e.g. Near Apollo Hospital" value={addressLine2} onChangeText={setAddressLine2} />
            
            <View style={{ flexDirection: 'row', gap: Spacing.md }}>
              <View style={{ flex: 1 }}>
                <Input label="City" placeholder="City" value={city} onChangeText={setCity} required />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="Pincode" placeholder="Pincode" value={pincode} onChangeText={setPincode} keyboardType="number-pad" maxLength={6} required />
              </View>
            </View>
            <Input label="State" placeholder="State" value={state} onChangeText={setState} required />
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <Button
            title="Save Address"
            onPress={handleSave}
            loading={addMutation.isPending}
            disabled={!latitude || !longitude || locationLoading}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  title: { fontSize: 18, fontWeight: '800', color: '#122018' },
  map: { flex: 1 },
  
  locateBtnWrap: {
    position: 'absolute', right: 16, zIndex: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
  },
  locateBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24, gap: 8,
  },
  locateText: { color: '#00B140', fontWeight: '700', fontSize: 14 },

  bottomSheet: {
    flex: 1, backgroundColor: '#FFF',
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 15,
  },
  dragHandleWrap: { width: '100%', alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
  dragHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#CBD5E1' },
  content: { padding: 20, paddingTop: 0, paddingBottom: 40 },
  
  searchContainer: { marginBottom: 24, zIndex: 30 },
  searchBoxContainer: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3,
  },
  searchInput: { fontSize: 15, fontWeight: '500', color: '#122018' },
  suggestionsList: {
    backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#E5EBE7',
    marginTop: 8, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 6,
  },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#EAF8F0' },
  suggestionTitle: { fontSize: 16, fontWeight: '800', color: '#122018', letterSpacing: -0.2 },
  suggestionSub: { fontSize: 13, color: '#66736B', marginTop: 4, fontWeight: '500' },

  formSection: { gap: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: '#122018', marginBottom: 16, letterSpacing: -0.3 },
  
  chipRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    backgroundColor: '#F7FAF8', borderWidth: 1, borderColor: '#E5EBE7',
  },
  chipActive: { backgroundColor: '#F3FAF5', borderColor: '#00B140' },
  chipText: { fontSize: 14, fontWeight: '600', color: '#66736B' },
  chipTextActive: { color: '#00B140' },

  footer: {
    padding: 20, paddingTop: 16,
    backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EAF8F0',
  }
});
