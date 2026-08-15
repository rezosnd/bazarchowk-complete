import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { useCurrentLocation } from '@/hooks';
import { HomeService } from '@/services/home.service';

const SOON_IMG = require('../../assets/images/soon.png');
const { width, height } = Dimensions.get('window');

export default function UnserviceableScreen() {
  const insets = useSafeAreaInsets();
  const location = useCurrentLocation();

  // If the user changes location and a market becomes available, auto-redirect to Home
  const { data: markets = [] } = useQuery({ 
    queryKey: ['markets', location?.lat, location?.lng], 
    queryFn: () => HomeService.getMarkets(location?.lat, location?.lng),
    enabled: !!location?.lat 
  });

  useEffect(() => {
    if (location?.lat && markets.length > 0) {
      // Valid market found for the new location! Redirect to home.
      router.replace('/');
    }
  }, [markets.length, location?.lat]);

  return (
    <View style={[styles.container, { backgroundColor: '#F0FDF4' }]}>
      <Image 
        source={SOON_IMG} 
        style={styles.fullImage} 
        contentFit="contain" 
      />
      
      {/* Invisible button overlay for 'Change Location' usually near the bottom */}
      <TouchableOpacity 
        style={[styles.invisibleBtn, { bottom: insets.bottom + 40 }]} 
        onPress={() => router.push('/addresses')}
        activeOpacity={0.5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  invisibleBtn: {
    position: 'absolute',
    width: width * 0.8,
    height: 60,
    alignSelf: 'center',
    borderRadius: 30,
    // uncomment for debugging touch area: backgroundColor: 'rgba(255,0,0,0.3)'
  }
});
