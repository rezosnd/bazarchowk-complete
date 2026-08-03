import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { useAddresses } from './useAddress';
import { useAuthStore } from '@/store';

export function useCurrentLocation() {
  const { isAuthenticated } = useAuthStore();
  const { data: addresses = [] } = useAddresses();
  
  const [location, setLocation] = useState<{ lat: number, lng: number, city?: string } | null>(null);

  useEffect(() => {
    (async () => {
      if (isAuthenticated && addresses.length > 0) {
        const defaultAddress = addresses.find((a: any) => a.isDefault) || addresses[0];
        if (defaultAddress && defaultAddress.latitude && defaultAddress.longitude) {
          setLocation({ 
            lat: defaultAddress.latitude, 
            lng: defaultAddress.longitude,
            city: defaultAddress.city 
          });
          return;
        }
      }

      // Fallback to GPS
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }
      try {
        let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        // Optional: Reverse geocode to get city
        let reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude
        });
        setLocation({ 
          lat: loc.coords.latitude, 
          lng: loc.coords.longitude,
          city: reverseGeocode[0]?.city || reverseGeocode[0]?.subregion || undefined
        });
      } catch (e) {
        console.warn('Failed to get location', e);
      }
    })();
  }, [addresses, isAuthenticated]);

  return location;
}
