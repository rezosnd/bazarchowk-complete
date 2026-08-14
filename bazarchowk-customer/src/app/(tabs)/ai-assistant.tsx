import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  withRepeat, withSequence, withTiming,
  useSharedValue, useAnimatedStyle
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export default function AIAssistant() {
  const insets = useSafeAreaInsets();

  const pulse = useSharedValue(1);
  const float = useSharedValue(0);

  React.useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1.07, { duration: 2000 }), withTiming(1, { duration: 2000 })),
      -1, true
    );
    float.value = withRepeat(
      withSequence(withTiming(-10, { duration: 2400 }), withTiming(0, { duration: 2400 })),
      -1, true
    );
  }, []);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }, { translateY: float.value }]
  }));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#0A0A1A', '#0D1B2A', '#0A0F1E']} style={StyleSheet.absoluteFill} />

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

        {/* Main message */}
        <View style={styles.card}>
          <Text style={styles.emoji}>🛠️</Text>
          <Text style={styles.cardTitle}>We'll be right back!</Text>
          <Text style={styles.cardDesc}>
            Our AI assistant is getting smarter. We're training it on thousands of local products, prices, and services to give you the best experience.
          </Text>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Under active development</Text>
          </View>
        </View>

        {/* Coming soon features */}
        <View style={styles.features}>
          {[
            { icon: 'mic', label: 'Voice Shopping', color: '#F59E0B' },
            { icon: 'search', label: 'Smart Search', color: '#10B981' },
            { icon: 'cart', label: 'AI Cart Builder', color: '#3B82F6' },
            { icon: 'language', label: 'Hindi / Local Language', color: '#EC4899' },
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
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },

  orbWrap: { marginBottom: 20 },
  orb: {
    width: 120, height: 120, borderRadius: 60,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 40, elevation: 20
  },

  aiName: { fontSize: 30, fontWeight: '900', color: '#FFF', letterSpacing: 1, marginBottom: 24 },

  card: {
    backgroundColor: 'rgba(124,58,237,0.15)', borderRadius: 24, padding: 24,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.4)',
    width: '100%', marginBottom: 20, alignItems: 'center'
  },
  emoji: { fontSize: 40, marginBottom: 12 },
  cardTitle: { fontSize: 24, fontWeight: '900', color: '#FFF', marginBottom: 12 },
  cardDesc: { fontSize: 14, color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B' },
  statusText: { fontSize: 13, color: '#F59E0B', fontWeight: '700' },

  features: { width: '100%', gap: 10, marginBottom: 28 },
  featureItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14,
    padding: 14, gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)'
  },
  featureIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  featureText: { flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  soonBadge: { backgroundColor: 'rgba(124,58,237,0.3)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  soonText: { fontSize: 11, color: '#A78BFA', fontWeight: '700' },

  footer: { fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center' },
});