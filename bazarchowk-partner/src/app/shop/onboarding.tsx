import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://bazarchowk-complete.vercel.app';

export default function ShopOnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [markets, setMarkets] = useState<any[]>([]);
  const [marketId, setMarketId] = useState('');
  
  // Selection
  const [offerType, setOfferType] = useState<'PRODUCTS' | 'SERVICES' | 'BOTH' | ''>('');
  const [partnerType, setPartnerType] = useState('OTHER');

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [deliveryRadius, setDeliveryRadius] = useState('5');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '';

  React.useEffect(() => {
    fetchMarkets();
  }, []);

  const fetchMarkets = async () => {
    try {
      const res = await fetch(`${API_BASE}/markets`);
      if (res.ok) {
        const data = await res.json();
        setMarkets(data);
      }
    } catch (e) {
      console.warn('Failed to fetch markets', e);
    }
  };

  const fetchCoordinates = async () => {
    setLoading(true);
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) throw new Error('Location services disabled');
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('Permission denied');
      
      let loc = await Location.getLastKnownPositionAsync();
      if (!loc) loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      
      if (loc) {
        const lat = loc.coords.latitude;
        const lng = loc.coords.longitude;
        setLatitude(lat.toString());
        setLongitude(lng.toString());

        // Reverse Geocode via Mapbox to auto-fill text fields
        try {
          const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}`);
          const data = await res.json();
          if (data.features && data.features.length > 0) {
            const place = data.features[0];
            const context = place.context || [];
            const cityObj = context.find((c: any) => c.id.startsWith('place'));
            const stateObj = context.find((c: any) => c.id.startsWith('region'));
            if (!address) setAddress(place.place_name.split(',')[0]);
            if (!city && cityObj) setCity(cityObj.text);
            if (!stateName && stateObj) setStateName(stateObj.text);
          }
        } catch (e) {}
      }
    } catch (e: any) {
      console.warn('GPS failed, attempting Mapbox text fallback', e);
      if (address && city) {
        try {
          const query = encodeURIComponent(`${address}, ${city}, ${stateName}`);
          const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${MAPBOX_TOKEN}`);
          const data = await res.json();
          if (data.features && data.features.length > 0) {
            const coords = data.features[0].center; // [lng, lat]
            setLongitude(coords[0].toString());
            setLatitude(coords[1].toString());
            alert('GPS failed, but we grabbed your coordinates via Mapbox from the address typed!');
          }
        } catch (err) {
          alert('Could not fetch location via GPS or Mapbox. Please enter manually.');
        }
      } else {
        alert('GPS Failed. Please enter Address and City, then try again to use Mapbox Fallback.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !address || !city || !stateName || !latitude || !longitude || !marketId) {
      alert('Please fill all mandatory fields (*), including Market, Latitude and Longitude.');
      return;
    }

    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('partner_token');
      if (!token) throw new Error('Authentication token missing. Please log in again.');
      
      const hasProducts = offerType === 'PRODUCTS' || offerType === 'BOTH';
      const hasServices = offerType === 'SERVICES' || offerType === 'BOTH';

      const payload = {
        name,
        description,
        address,
        city,
        state: stateName,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        deliveryRadius: parseFloat(deliveryRadius),
        hasProducts,
        hasServices,
        partnerType,
        marketId
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
        
        alert('Business Profile Completed Successfully!');
        if (hasServices && !hasProducts) {
          router.push('/services' as any);
        } else {
          router.push('/' as any);
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
      <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
        <View className="px-6 py-8 bg-white border-b border-gray-100 shadow-sm z-10">
          <Text className="text-3xl font-extrabold text-gray-900 tracking-tight">What would you like to offer?</Text>
          <Text className="text-emerald-600 font-bold mt-2 text-base">Select how you want to grow your business</Text>
        </View>
        <ScrollView className="flex-1 px-4 pt-8" contentContainerStyle={{ paddingBottom: 100 }}>
          
          <TouchableOpacity
            onPress={() => setOfferType('PRODUCTS')}
            className={`bg-white p-6 rounded-3xl mb-4 border-2 shadow-sm flex-row items-center ${
              offerType === 'PRODUCTS' ? 'border-emerald-500 bg-emerald-50' : 'border-transparent'
            }`}
          >
            <View className={`w-16 h-16 rounded-full items-center justify-center mr-4 ${
              offerType === 'PRODUCTS' ? 'bg-emerald-500 shadow-md shadow-emerald-500/30' : 'bg-emerald-50'
            }`}>
              <Ionicons name="cart" size={32} color={offerType === 'PRODUCTS' ? '#FFF' : '#059669'} />
            </View>
            <View className="flex-1">
              <Text className={`text-xl font-extrabold ${offerType === 'PRODUCTS' ? 'text-emerald-800' : 'text-gray-900'}`}>Sell Products</Text>
              <Text className="text-gray-500 text-sm mt-1 leading-5">Grocery, Pharmacy, Restaurant Food, Electronics, Fashion</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setOfferType('SERVICES')}
            className={`bg-white p-6 rounded-3xl mb-4 border-2 shadow-sm flex-row items-center ${
              offerType === 'SERVICES' ? 'border-orange-500 bg-orange-50' : 'border-transparent'
            }`}
          >
            <View className={`w-16 h-16 rounded-full items-center justify-center mr-4 ${
              offerType === 'SERVICES' ? 'bg-orange-500 shadow-md shadow-orange-500/30' : 'bg-orange-50'
            }`}>
              <Ionicons name="calendar" size={32} color={offerType === 'SERVICES' ? '#FFF' : '#EA580C'} />
            </View>
            <View className="flex-1">
              <Text className={`text-xl font-extrabold ${offerType === 'SERVICES' ? 'text-orange-800' : 'text-gray-900'}`}>Provide Services</Text>
              <Text className="text-gray-500 text-sm mt-1 leading-5">Salon, Plumber, Electrician, Doctor, Tutor, Cleaning</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setOfferType('BOTH')}
            className={`bg-white p-6 rounded-3xl mb-4 border-2 shadow-sm flex-row items-center ${
              offerType === 'BOTH' ? 'border-blue-500 bg-blue-50' : 'border-transparent'
            }`}
          >
            <View className={`w-16 h-16 rounded-full items-center justify-center mr-4 ${
              offerType === 'BOTH' ? 'bg-blue-500 shadow-md shadow-blue-500/30' : 'bg-blue-50'
            }`}>
              <Ionicons name="briefcase" size={32} color={offerType === 'BOTH' ? '#FFF' : '#3B82F6'} />
            </View>
            <View className="flex-1">
              <Text className={`text-xl font-extrabold ${offerType === 'BOTH' ? 'text-blue-800' : 'text-gray-900'}`}>Both Products & Services</Text>
              <Text className="text-gray-500 text-sm mt-1 leading-5">Run a hybrid business offering both products and bookings.</Text>
            </View>
          </TouchableOpacity>

        </ScrollView>
        <View className="px-6 py-4 bg-white border-t border-gray-100 shadow-lg">
          <TouchableOpacity 
            disabled={!offerType}
            onPress={() => setStep(2)}
            className={`h-14 rounded-2xl items-center justify-center shadow-lg ${
              offerType ? (offerType === 'PRODUCTS' ? 'bg-emerald-600 shadow-emerald-600/30' : offerType === 'SERVICES' ? 'bg-orange-600 shadow-orange-600/30' : 'bg-blue-600 shadow-blue-600/30') : 'bg-gray-300'
            }`}
          >
            <Text className="text-white font-bold text-lg">Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isProfessional = offerType === 'SERVICES';

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      <View className="px-6 py-5 bg-white border-b border-gray-100 shadow-sm z-10 flex-row items-center">
        <TouchableOpacity onPress={() => setStep(1)} className="mr-4 h-10 w-10 bg-gray-50 rounded-full items-center justify-center">
          <Feather name="arrow-left" size={20} color="#0F172A" />
        </TouchableOpacity>
        <View>
          <Text className="text-2xl font-extrabold text-gray-900 tracking-tight">Complete Profile</Text>
          <Text className="text-emerald-600 font-bold text-sm mt-0.5">Step 2: Business Information</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-6" contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-5">
          <Text className="text-lg font-extrabold text-gray-900 mb-5">{isProfessional ? 'Professional Details' : 'Business Details'}</Text>
          
          <Text className="text-sm font-bold text-gray-500 mb-2">Business Category *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4" contentContainerStyle={{ paddingRight: 20 }}>
            {(offerType === 'SERVICES' 
              ? ['SALON', 'PLUMBER', 'ELECTRICIAN', 'CARPENTER', 'AC_REPAIR', 'CLEANING', 'TUTOR', 'MECHANIC', 'PANDIT', 'OTHER'] 
              : ['GROCERY', 'PHARMACY', 'RESTAURANT', 'OTHER']
            ).map(pt => (
              <TouchableOpacity
                key={pt}
                onPress={() => setPartnerType(pt)}
                className={`px-4 py-2.5 mr-2 rounded-xl border ${partnerType === pt ? 'bg-emerald-50 border-emerald-500' : 'bg-gray-50 border-gray-200'}`}
              >
                <Text className={`font-bold ${partnerType === pt ? 'text-emerald-700' : 'text-gray-600'}`}>{pt.replace('_', ' ')}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text className="text-sm font-bold text-gray-500 mb-2">{isProfessional ? 'Your Full Name / Brand *' : 'Business/Shop Name *'}</Text>
          <TextInput 
            className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-base text-gray-900 font-medium mb-4" 
            placeholder={isProfessional ? "e.g. John Doe Plumbing" : "e.g. Fresh Groceries Mart"} 
            placeholderTextColor="#9ca3af"
            value={name} 
            onChangeText={setName} 
          />

          <Text className="text-sm font-bold text-gray-500 mb-2">Description & Experience</Text>
          <TextInput 
            className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-base text-gray-900 font-medium mb-2 h-24" 
            placeholder={isProfessional ? "Tell customers about your experience..." : "Tell customers about your shop..."} 
            placeholderTextColor="#9ca3af"
            textAlignVertical="top"
            value={description} 
            onChangeText={setDescription}
            multiline
          />
        </View>

        <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-5">
          <Text className="text-lg font-extrabold text-gray-900 mb-5">Select Market *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
            {markets.length === 0 ? (
              <Text className="text-gray-500 italic">No markets found. Contact Admin.</Text>
            ) : (
              markets.map(m => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => setMarketId(m.id)}
                  className={`px-4 py-3 mr-3 rounded-xl border ${marketId === m.id ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-gray-200'}`}
                >
                  <Text className={`font-bold ${marketId === m.id ? 'text-blue-700' : 'text-gray-600'}`}>{m.name}</Text>
                  <Text className={`text-xs mt-1 ${marketId === m.id ? 'text-blue-500' : 'text-gray-400'}`}>{m.village?.name || 'Local'} Area</Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>

        <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-5">
          <Text className="text-lg font-extrabold text-gray-900 mb-5">{isProfessional ? 'Service Area' : 'Location Details'}</Text>
          
          <Text className="text-sm font-bold text-gray-500 mb-2">{isProfessional ? 'Base Address / Locality *' : 'Street Address *'}</Text>
          <TextInput 
            className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-base text-gray-900 font-medium mb-4" 
            placeholder="Shop No, Building, Street" 
            placeholderTextColor="#9ca3af"
            value={address} 
            onChangeText={setAddress} 
          />

          <View className="flex-row space-x-3 mb-4">
            <View className="flex-1 mr-2">
              <Text className="text-sm font-bold text-gray-500 mb-2">City *</Text>
              <TextInput className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-base text-gray-900 font-medium" placeholder="City" placeholderTextColor="#9ca3af" value={city} onChangeText={setCity} />
            </View>
            <View className="flex-1 ml-2">
              <Text className="text-sm font-bold text-gray-500 mb-2">State *</Text>
              <TextInput className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-base text-gray-900 font-medium" placeholder="State" placeholderTextColor="#9ca3af" value={stateName} onChangeText={setStateName} />
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-sm font-bold text-gray-500 mb-2">{isProfessional ? 'Service Radius (km)' : 'Delivery Radius (km)'}</Text>
            <TextInput 
              className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-base text-gray-900 font-medium" 
              placeholder="5" 
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              value={deliveryRadius} 
              onChangeText={setDeliveryRadius} 
            />
          </View>

          <View className="flex-row justify-between items-center mt-2 mb-4">
            <Text className="text-lg font-extrabold text-gray-900">Map Coordinates</Text>
            <TouchableOpacity onPress={fetchCoordinates} className="bg-emerald-100 px-4 py-2 rounded-xl">
              <Text className="text-emerald-700 font-bold text-xs flex-row items-center">
                <Ionicons name="location" size={12} /> Auto Fetch GPS
              </Text>
            </TouchableOpacity>
          </View>
          
          <View className="flex-row space-x-3">
            <View className="flex-1 mr-2">
              <Text className="text-sm font-bold text-gray-500 mb-2">Latitude *</Text>
              <TextInput className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-base text-gray-900 font-medium" placeholder="e.g. 25.5941" placeholderTextColor="#9ca3af" keyboardType="numeric" value={latitude} onChangeText={setLatitude} />
            </View>
            <View className="flex-1 ml-2">
              <Text className="text-sm font-bold text-gray-500 mb-2">Longitude *</Text>
              <TextInput className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-base text-gray-900 font-medium" placeholder="e.g. 85.1376" placeholderTextColor="#9ca3af" keyboardType="numeric" value={longitude} onChangeText={setLongitude} />
            </View>
          </View>
        </View>

        <TouchableOpacity 
          onPress={handleRegister} 
          disabled={loading}
          className="h-14 bg-gray-900 rounded-2xl items-center justify-center shadow-lg shadow-gray-900/30 mt-2 mb-8"
        >
          {loading ? <ActivityIndicator color="#FFF" /> : <Text className="text-white font-bold text-lg">Complete Registration</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
