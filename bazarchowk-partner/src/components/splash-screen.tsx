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

const { width: W } = Dimensions.get('window');
const SPLASH_SRC = require('../../assets/images/splash-screeb.png');

interface SplashContentProps {
  onFinish: () => void;
  appReady: boolean;
}

function SplashContent({ onFinish, appReady }: SplashContentProps) {
  const baseOpacity = useSharedValue(0);
  const baseScale   = useSharedValue(0.97);
  const breathScale = useSharedValue(1);
  const floatX      = useSharedValue(0);
  const floatY      = useSharedValue(0);
  const shimmerPos  = useSharedValue(-W * 1.5);

  const minDone = useRef(false);
  const appDone = useRef(appReady);

  const tryExit = useRef(() => {
    if (minDone.current && appDone.current) {
      onFinish();
    }
  });

  useEffect(() => {
    baseOpacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
    baseScale.value   = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });

    breathScale.value = withDelay(
      800,
      withRepeat(
        withSequence(
          withTiming(1.02, { duration: 1250, easing: Easing.inOut(Easing.sin) }),
          withTiming(1.00, { duration: 1250, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );

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

    shimmerPos.value = withDelay(
      1000,
      withRepeat(
        withSequence(
          withTiming(W * 1.5, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(-W * 1.5, { duration: 2300 })
        ),
        -1,
        false
      )
    );

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

interface OverlayProps {
  appReady?: boolean;
}

export function BazarChowkSplashOverlay({ appReady = false }: OverlayProps) {
  const overlayOpacity = useSharedValue(1);
  const overlayScale   = useSharedValue(1);

  const handleFinish = () => {
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
    width: W * 0.6,
  },
});
