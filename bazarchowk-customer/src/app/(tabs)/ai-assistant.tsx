import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Animated, { withRepeat, withTiming, withSequence, useSharedValue, useAnimatedStyle, useEffect } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export default function AIAssistant() {
  const insets = useSafeAreaInsets();
  
  const pulse = useSharedValue(1);
  const float = useSharedValue(0);

  React.useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1800 }),
        withTiming(1, { duration: 1800 })
      ),
      -1,
      true
    );

    float.value = withRepeat(
      withSequence(
        withTiming(-12, { duration: 2200 }),
        withTiming(0, { duration: 2200 })
      ),
      -1,
      true
    );
  }, []);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }, { translateY: float.value }]
  }));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#0A0A1A', '#0D1B2A', '#0A0F1E']} style={StyleSheet.absoluteFill} />

      {/* Back button */}
      <TouchableOpacity onPress={() => router.navigate('/(tabs)')} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.8)" />
      </TouchableOpacity>

      <View style={styles.content}>
        {/* AI Orb */}
        <Animated.View style={[styles.orbWrap, orbStyle]}>
          <LinearGradient
            colors={['#7C3AED', '#4F46E5', '#2563EB']}
            style={styles.orb}
          >
            <Ionicons name="sparkles" size={52} color="#FFF" />
          </LinearGradient>
        </Animated.View>

        <Text style={styles.aiName}>BazarChowk AI</Text>
        <Text style={styles.tagline}>Your Intelligent Shopping Assistant</Text>

        {/* Coming Soon card */}
        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <Ionicons name="rocket" size={24} color="#7C3AED" />
          </View>
          <Text style={styles.cardTitle}>Coming Very Soon! 🚀</Text>
          <Text style={styles.cardDesc}>
            I'm being trained on thousands of local products, services, and market data to give you hyper-personalized recommendations in your language.
          </Text>
        </View>

        {/* Features preview */}
        <View style={styles.features}>
          {[
            { icon: 'search', label: 'Voice Search Products', color: '#F59E0B' },
            { icon: 'calendar', label: 'Book Appointments', color: '#10B981' },
            { icon: 'cart', label: 'Smart Cart Building', color: '#3B82F6' },
            { icon: 'language', label: 'Multilingual Support', color: '#EC4899' },
          ].map((f, i) => (
            <View key={i} style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: f.color + '22' }]}>
                <Ionicons name={f.icon as any} size={18} color={f.color} />
              </View>
              <Text style={styles.featureText}>{f.label}</Text>
              <View style={styles.soonBadge}><Text style={styles.soonText}>Soon</Text></View>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>Powered by Google Gemini · Built with ❤️ for BazarChowk</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { position: 'absolute', top: 56, left: 20, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },

  orbWrap: { marginBottom: 24 },
  orb: { width: 130, height: 130, borderRadius: 65, alignItems: 'center', justifyContent: 'center', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 40, elevation: 20 },

  aiName: { fontSize: 32, fontWeight: '900', color: '#FFF', letterSpacing: 1, marginBottom: 8 },
  tagline: { fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: '500', marginBottom: 32 },

  card: { backgroundColor: 'rgba(124,58,237,0.15)', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(124,58,237,0.4)', width: '100%', marginBottom: 20, alignItems: 'center' },
  cardIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(124,58,237,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 20, fontWeight: '900', color: '#FFF', marginBottom: 10 },
  cardDesc: { fontSize: 14, color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 22 },

  features: { width: '100%', gap: 10, marginBottom: 28 },
  featureItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 14, gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  featureIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  featureText: { flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  soonBadge: { backgroundColor: 'rgba(124,58,237,0.3)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  soonText: { fontSize: 11, color: '#A78BFA', fontWeight: '700' },

  footer: { fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center' },
});