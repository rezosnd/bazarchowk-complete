import { useState, useEffect, useMemo } from 'react';
import * as Location from 'expo-location';
import { useAddresses } from './useAddress';
import { useAuthStore } from '@/store';

export function useCurrentLocation() {
  const { isAuthenticated } = useAuthStore();
  const { data: addresses = [] } = useAddresses();

  const [location, setLocation] = useState<{ lat: number; lng: number; city?: string } | null>(null);

  // Derive stable primitives from default address — avoids infinite re-render loops
  const defaultAddr = useMemo(() => {
    const arr = addresses as any[];
    return arr.find((a) => a.isDefault) || arr[0] || null;
  }, [addresses]);

  const depLat: number | null = defaultAddr?.latitude ?? null;
  const depLng: number | null = defaultAddr?.longitude ?? null;
  const depCity: string | null = defaultAddr?.city ?? null;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // 1. Use saved address coordinates first (triggers reactively when address changes)
      if (isAuthenticated && depLat && depLng) {
        if (!cancelled) {
          setLocation({ lat: depLat, lng: depLng, city: depCity ?? undefined });
        }
        return;
      }

      // 2. Fallback: live GPS
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const geo = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });

        if (!cancelled) {
          setLocation({
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            city: geo[0]?.city || geo[0]?.subregion || undefined,
          });
        }
      } catch (e) {
        console.warn('[useCurrentLocation] GPS fallback failed', e);
      }
    })();

    return () => { cancelled = true; };
  // Re-runs only when default address lat/lng/city actually change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, depLat, depLng, depCity]);

  return location;
}
