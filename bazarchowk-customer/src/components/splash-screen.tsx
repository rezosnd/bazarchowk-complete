/**
 * BazarChowk – World-Class Premium Splash Screen
 *
 * 100% Minimalist, ultra-premium experience.
 * Absolutely NO loaders, spinners, or dots. 
 * The splash image itself is the pure hero.
 * 
 * Features:
 * - Edge-to-edge full-cover image (105% bounds to prevent white borders during scale)
 * - Entrance animation (Scale 0.97 -> 1.00, Fade 0 -> 1 over 800ms)
 * - "Living Screen" subtle floating depth (X/Y movement -2px to +2px)
 * - Premium 2% breathing scale pulse (1.00 -> 1.02 -> 1.00 over 2500ms)
 * - Elegant luxury light sweep effect (shimmering glass overlay)
 * - Exits smoothly when app is ready.
 */

import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

// ─── Screen metrics ───────────────────────────────────────────────────────────
const { width: W } = Dimensions.get('window');

// ─── Asset ───────────────────────────────────────────────────────────────────
const SPLASH_SRC = require('@/assets/images/splash-screeb.png');

// ─────────────────────────────────────────────────────────────────────────────
// SplashContent – pure image hero, living animations, exit orchestration
// ─────────────────────────────────────────────────────────────────────────────
interface SplashContentProps {
  onFinish: () => void;
  appReady: boolean;
}

function SplashContent({ onFinish, appReady }: SplashContentProps) {
  // Entrance & Exit
  const baseOpacity = useSharedValue(0);
  const baseScale   = useSharedValue(0.97);

  // Living Screen Effects
  const breathScale = useSharedValue(1);
  const floatX      = useSharedValue(0);
  const floatY      = useSharedValue(0);

  // Shimmer Sweep
  const shimmerPos  = useSharedValue(-W * 1.5);

  const minDone = useRef(false);
  const appDone = useRef(appReady);

  const tryExit = useRef(() => {
    if (minDone.current && appDone.current) {
      onFinish();
    }
  });

  useEffect(() => {
    // ── 1. Entrance Animation (800ms) ──────────────────────────────────────
    baseOpacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
    baseScale.value   = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });

    // ── 2. Breathing Pulse (1 -> 1.02 -> 1 over 2500ms, infinite) ──────────
    breathScale.value = withDelay(
      800, // wait for entrance to finish
      withRepeat(
        withSequence(
          withTiming(1.02, { duration: 1250, easing: Easing.inOut(Easing.sin) }),
          withTiming(1.00, { duration: 1250, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );

    // ── 3. Subtle Floating Depth (-2px to +2px) ────────────────────────────
    floatX.value = withRepeat(
      withSequence(
        withTiming(2,  { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        withTiming(-2, { duration: 3000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    floatY.value = withRepeat(
      withSequence(
        withTiming(-2, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        withTiming(2,  { duration: 2500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    // ── 4. Elegant Light Sweep (repeats every 3.5s) ────────────────────────
    shimmerPos.value = withDelay(
      1000,
      withRepeat(
        withSequence(
          withTiming(W * 1.5, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(-W * 1.5, { duration: 2300 }) // invisible instant reset & pause
        ),
        -1,
        false
      )
    );

    // ── Timers ─────────────────────────────────────────────────────────────
    const minTimer = setTimeout(() => {
      minDone.current = true;
      tryExit.current();
    }, 2200);

    const capTimer = setTimeout(() => {
      appDone.current = true;
      minDone.current = true;
      onFinish();
    }, 3500);

    return () => {
      clearTimeout(minTimer);
      clearTimeout(capTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (appReady) {
      appDone.current = true;
      tryExit.current();
    }
  }, [appReady]);

  const imageContainerStyle = useAnimatedStyle(() => ({
    opacity: baseOpacity.value,
    transform: [
      { scale: baseScale.value * breathScale.value },
      { translateX: floatX.value },
      { translateY: floatY.value },
    ],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: shimmerPos.value },
      { skewX: '-25deg' },
    ],
  }));

  return (
    <Animated.View style={[styles.imageWrapper, imageContainerStyle]}>
      {/* Hero Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={SPLASH_SRC}
          style={styles.logo}
          contentFit="cover"
          contentPosition="center"
          priority="high"
          cachePolicy="memory-disk"
          transition={0}
        />
      </View>

      {/* Elegant Light Sweep Overlay */}
      <Animated.View style={[styles.shimmerContainer, shimmerStyle]}>
        <LinearGradient
          colors={[
            'rgba(255,255,255,0)', 
            'rgba(255,255,255,0.05)', 
            'rgba(255,255,255,0.2)', 
            'rgba(255,255,255,0.05)', 
            'rgba(255,255,255,0)'
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BazarChowkSplashOverlay – top-level overlay, owns the exit animation
// ─────────────────────────────────────────────────────────────────────────────
interface OverlayProps {
  appReady?: boolean;
}

export function BazarChowkSplashOverlay({ appReady = false }: OverlayProps) {
  const overlayOpacity = useSharedValue(1);
  const overlayScale   = useSharedValue(1);

  const handleFinish = () => {
    // 450ms Exit Animation
    overlayOpacity.value = withTiming(0, { duration: 450, easing: Easing.out(Easing.cubic) });
    overlayScale.value   = withTiming(1.03, { duration: 450, easing: Easing.out(Easing.cubic) });
  };

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
    transform: [{ scale: overlayScale.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.overlay, overlayStyle]}
    >
      <SplashContent onFinish={handleFinish} appReady={appReady} />
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    zIndex: 9999,
    backgroundColor: '#FFFFFF', 
  },
  imageWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  shimmerContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: W * 0.6, // Shimmer band width
  },
});
