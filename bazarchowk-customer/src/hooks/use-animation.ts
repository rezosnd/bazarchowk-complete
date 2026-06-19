import { useCallback, useRef } from 'react';
import { Animated, Easing } from 'react-native';

interface UseAnimationOptions {
  duration?: number;
  easing?: (value: number) => number;
  useNativeDriver?: boolean;
}

export function useFadeIn(options: UseAnimationOptions = {}) {
  const opacity = useRef(new Animated.Value(0)).current;

  const fadeIn = useCallback(
    (callback?: () => void) => {
      Animated.timing(opacity, {
        toValue: 1,
        duration: options.duration ?? 300,
        easing: options.easing ?? Easing.out(Easing.ease),
        useNativeDriver: options.useNativeDriver ?? true,
      }).start(callback);
    },
    [opacity, options.duration, options.easing, options.useNativeDriver]
  );

  const fadeOut = useCallback(
    (callback?: () => void) => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: options.duration ?? 300,
        easing: options.easing ?? Easing.in(Easing.ease),
        useNativeDriver: options.useNativeDriver ?? true,
      }).start(callback);
    },
    [opacity, options.duration, options.easing, options.useNativeDriver]
  );

  return { opacity, fadeIn, fadeOut };
}

export function useScaleAnimation(initialValue = 1) {
  const scale = useRef(new Animated.Value(initialValue)).current;

  const animateTo = useCallback(
    (toValue: number, duration = 200, callback?: () => void) => {
      Animated.spring(scale, {
        toValue,
        useNativeDriver: true,
        tension: 60,
        friction: 7,
      }).start(callback);
    },
    [scale]
  );

  const press = useCallback(() => animateTo(0.96), [animateTo]);
  const release = useCallback(() => animateTo(1), [animateTo]);

  return { scale, animateTo, press, release };
}
