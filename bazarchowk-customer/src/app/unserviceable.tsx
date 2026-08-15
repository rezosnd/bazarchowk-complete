import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useTheme } from '@/hooks';

const LOGO_SRC = require('../../assets/images/logo.png');

const PRIMARY = '#00B140';

export default function UnserviceableScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation for the notification button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
      ])
    ).start();

    // Float animation for the illustration
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -5, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
      ])
    ).start();
  }, []);

  return (
    <ScrollView style={[styles.container, { backgroundColor: '#F0FDF4' }]} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
      {/* Top Logo & Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Image source={LOGO_SRC} style={styles.logo} contentFit="contain" />
        
        <View style={styles.locationIndicator}>
          <Ionicons name="location" size={14} color={PRIMARY} />
          <Text style={styles.locationText}>Location checked</Text>
        </View>

        <Text style={styles.headline}>
          <Text style={{ color: '#0F172A' }}>Coming </Text>
          <Text style={{ color: PRIMARY }}>Soon</Text>
        </Text>
        <Text style={styles.subHeadline}>We're setting up BazarChowk in your area!</Text>
      </View>

      {/* Main Illustration (Animated) */}
      <Animated.View style={[styles.illustrationContainer, { transform: [{ translateY: floatAnim }] }]}>
        {/* Placeholder for the premium illustration */}
        <View style={styles.illustrationPlaceholder}>
          <Ionicons name="storefront" size={80} color={PRIMARY} style={{ opacity: 0.8 }} />
          <Ionicons name="bag-handle" size={40} color="#FF8A00" style={{ position: 'absolute', right: 40, bottom: 20 }} />
          <Ionicons name="location" size={50} color={PRIMARY} style={{ position: 'absolute', left: 40, top: 40 }} />
        </View>
      </Animated.View>

      {/* Location Message Card */}
      <View style={styles.messageCard}>
        <View style={styles.messageHeader}>
          <Ionicons name="location" size={20} color={PRIMARY} />
          <Text style={styles.messageLocationText}>We checked your location</Text>
        </View>
        
        <Text style={styles.mainMessage}>BazarChowk is not available in your area yet.</Text>
        <Text style={styles.hindiMessage}>आपके क्षेत्र में अभी BazarChowk उपलब्ध नहीं है।</Text>
        <Text style={styles.positiveMessage}>लेकिन हम बहुत जल्द आपके पास होंगे! 💚</Text>

        {/* Services Preview */}
        <View style={styles.servicesGrid}>
          <View style={styles.serviceItem}>
            <View style={[styles.serviceIcon, { backgroundColor: '#22C55E' }]}><Ionicons name="cart" size={24} color="#FFF" /></View>
            <Text style={styles.serviceText}>Grocery</Text>
            <Text style={styles.serviceHindi}>किराना</Text>
          </View>
          <View style={styles.serviceItem}>
            <View style={[styles.serviceIcon, { backgroundColor: '#F97316' }]}><Ionicons name="fast-food" size={24} color="#FFF" /></View>
            <Text style={styles.serviceText}>Food</Text>
            <Text style={styles.serviceHindi}>भोजन</Text>
          </View>
          <View style={styles.serviceItem}>
            <View style={[styles.serviceIcon, { backgroundColor: '#10B981' }]}><MaterialCommunityIcons name="pill" size={24} color="#FFF" /></View>
            <Text style={styles.serviceText}>Medicine</Text>
            <Text style={styles.serviceHindi}>दवा</Text>
          </View>
          <View style={styles.serviceItem}>
            <View style={[styles.serviceIcon, { backgroundColor: '#3B82F6' }]}><Ionicons name="build" size={24} color="#FFF" /></View>
            <Text style={styles.serviceText}>Services</Text>
            <Text style={styles.serviceHindi}>सेवाएं</Text>
          </View>
        </View>
      </View>

      {/* Notify Me Section */}
      <View style={styles.notifySection}>
        <Text style={styles.notifyTitle}>Be the first to know!</Text>
        <Text style={styles.notifySubtitle}>जैसे ही BazarChowk आपके क्षेत्र में शुरू होगा, हम आपको सूचित करेंगे।</Text>
        
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity style={styles.notifyBtn} activeOpacity={0.8}>
            <Ionicons name="notifications" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.notifyBtnText}>Notify Me</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Secondary Actions */}
      <View style={styles.footerActions}>
        <TouchableOpacity 
          style={styles.changeLocationBtn} 
          onPress={() => router.push('/addresses')}
          activeOpacity={0.6}
        >
          <Ionicons name="location-outline" size={16} color="#0F172A" style={{ marginRight: 6 }} />
          <Text style={styles.changeLocationText}>Change Location</Text>
        </TouchableOpacity>
        
        <Text style={styles.footerText}>Thank you for your patience! 💚</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logo: {
    width: 140,
    height: 40,
    marginBottom: 16,
  },
  locationIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '600',
    color: PRIMARY,
    marginLeft: 4,
  },
  headline: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subHeadline: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  illustrationContainer: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  illustrationPlaceholder: {
    width: 280,
    height: 180,
    backgroundColor: '#DCFCE7',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#BBF7D0',
  },
  messageCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  messageLocationText: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 6,
    fontWeight: '500',
  },
  mainMessage: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  hindiMessage: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 8,
  },
  positiveMessage: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIMARY,
    textAlign: 'center',
    marginBottom: 24,
  },
  servicesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  serviceItem: {
    alignItems: 'center',
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  serviceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  serviceHindi: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  notifySection: {
    backgroundColor: '#DCFCE7',
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  notifyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  notifySubtitle: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 16,
  },
  notifyBtn: {
    backgroundColor: PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 100,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  notifyBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footerActions: {
    alignItems: 'center',
  },
  changeLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFF',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  changeLocationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  footerText: {
    fontSize: 13,
    color: '#64748B',
  }
});
