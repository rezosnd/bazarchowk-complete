import { create } from 'zustand';

interface AppState {
  // Location
  locationPermission: 'granted' | 'denied' | 'undetermined';
  currentCity: string | null;
  coordinates: { lat: number; lng: number } | null;

  // UI
  isOnline: boolean;

  // Actions
  setLocationPermission: (status: 'granted' | 'denied' | 'undetermined') => void;
  setCurrentCity: (city: string) => void;
  setCoordinates: (coords: { lat: number; lng: number }) => void;
  setIsOnline: (online: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  locationPermission: 'undetermined',
  currentCity: null,
  coordinates: null,
  isOnline: true,

  setLocationPermission: (status) => set({ locationPermission: status }),
  setCurrentCity: (city) => set({ currentCity: city }),
  setCoordinates: (coords) => set({ coordinates: coords }),
  setIsOnline: (online) => set({ isOnline: online }),
}));
