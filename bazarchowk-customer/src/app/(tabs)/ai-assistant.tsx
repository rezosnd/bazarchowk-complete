import { Text as AppText } from '@/components/TranslatedText';
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks';

export default function AIAssistant() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <Animated.View style={[styles.circle, { backgroundColor: theme.primarySurface, transform: [{ scale: pulseAnim }] }]}>
          <Ionicons name="sparkles" size={48} color={theme.primary} />
        </Animated.View>
        <AppText style={[styles.title, { color: theme.text }]}>BazarChowk AI</AppText>
        <AppText style={[styles.subtitle, { color: theme.textSecondary }]}>We are training our AI to serve you better. Coming soon!</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  circle: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 16, textAlign: 'center', lineHeight: 24 }
});