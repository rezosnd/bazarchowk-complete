import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, Text, View, Dimensions, Image, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  Easing,
  interpolate,
  withDelay,
  Extrapolation,
  runOnJS,
  SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
// import { FloatingCart } from '@/components/FloatingCart';

const { width: W, height: H } = Dimensions.get('window');
const EMERALD = '#00B140';

// Helper for haptics
function triggerHaptics(type: 'heavy' | 'light' | 'selection' | 'medium') {
  if (type === 'heavy') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  if (type === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  if (type === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  if (type === 'selection') Haptics.selectionAsync();
}

import { useAIStore } from '@/store/aiStore';
import { useAuthStore } from '@/store/auth.store';
import { useCartStore } from '@/store/cart.store';

// ─── Global AI Overlay ────────────────────────────────────────────────────────

function GlobalAIOverlay() {
  const isListening = useAIStore((state) => state.isListening);
  const overlayOpacity = useSharedValue(0);
  const insets = useSafeAreaInsets();
  
  const bottomPad = Platform.OS === 'ios' ? insets.bottom : 16;
  const tabHeight = 65 + bottomPad;
  
  const r1 = useSharedValue(0);
  const r2 = useSharedValue(0);
  const r3 = useSharedValue(0);
  const r4 = useSharedValue(0);
  const r5 = useSharedValue(0);

  const particleIds = Array.from({ length: 24 }).map((_, i) => i);

  useEffect(() => {
    if (isListening) {
      overlayOpacity.value = withTiming(1, { duration: 300 });
      r1.value = 0; r2.value = 0; r3.value = 0; r4.value = 0; r5.value = 0;
      r1.value = withRepeat(withTiming(1, { duration: 3000, easing: Easing.out(Easing.ease) }), -1, false);
      r2.value = withDelay(600, withRepeat(withTiming(1, { duration: 3000, easing: Easing.out(Easing.ease) }), -1, false));
      r3.value = withDelay(1200, withRepeat(withTiming(1, { duration: 3000, easing: Easing.out(Easing.ease) }), -1, false));
      r4.value = withDelay(1800, withRepeat(withTiming(1, { duration: 3000, easing: Easing.out(Easing.ease) }), -1, false));
      r5.value = withDelay(2400, withRepeat(withTiming(1, { duration: 3000, easing: Easing.out(Easing.ease) }), -1, false));
    } else {
      overlayOpacity.value = withTiming(0, { duration: 300 });
      r1.value = 0; r2.value = 0; r3.value = 0; r4.value = 0; r5.value = 0;
    }
  }, [isListening]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const rippleBase = {
    position: 'absolute' as const,
    bottom: tabHeight - 500, // Perfectly centered on the mic button
    alignSelf: 'center' as const,
    width: 1000,
    height: 1000,
    borderRadius: 500,
    borderWidth: 12,
    borderColor: 'rgba(255, 138, 0, 0.25)', // Softer Premium Orange
  };

  const style1 = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(r1.value, [0, 1], [0.05, 1]) }],
    opacity: interpolate(r1.value, [0, 1], [1, 0])
  }));
  const style2 = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(r2.value, [0, 1], [0.05, 1]) }],
    opacity: interpolate(r2.value, [0, 1], [1, 0])
  }));
  const style3 = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(r3.value, [0, 1], [0.05, 1]) }],
    opacity: interpolate(r3.value, [0, 1], [1, 0])
  }));
  const style4 = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(r4.value, [0, 1], [0.05, 1]) }],
    opacity: interpolate(r4.value, [0, 1], [1, 0])
  }));
  const style5 = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(r5.value, [0, 1], [0.05, 1]) }],
    opacity: interpolate(r5.value, [0, 1], [1, 0])
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, overlayStyle, { zIndex: 999 }]} pointerEvents="none">
      <BlurView intensity={40} style={StyleSheet.absoluteFill} tint="dark" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
      
      <Animated.View style={[rippleBase, style1]} />
      <Animated.View style={[rippleBase, style2]} />
      <Animated.View style={[rippleBase, style3]} />
      <Animated.View style={[rippleBase, style4]} />
      <Animated.View style={[rippleBase, style5]} />

      {/* Crisp Mic Button perfectly aligned over the blur */}
      <View style={{
        position: 'absolute',
        bottom: tabHeight - 36,
        alignSelf: 'center',
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: EMERALD,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: EMERALD,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 30,
        elevation: 10,
      }}>
        <Ionicons name="mic" size={30} color="#FFF" style={{ left: 0, top: 0 }} />
      </View>
    </Animated.View>
  );
}

// ─── AI Button Component ──────────────────────────────────────────────────────

function AIButton({ label, aiActiveState }: { label: string, aiActiveState: SharedValue<number> }) {
  const isListening = useAIStore((state) => state.isListening);
  const toggleListening = useAIStore((state) => state.toggleListening);

  // Interaction Physics
  const pressScale = useSharedValue(1);

  useEffect(() => {
    if (isListening) {
      runOnJS(triggerHaptics)('selection');
      aiActiveState.value = withTiming(1, { duration: 250 });
    } else {
      runOnJS(triggerHaptics)('medium');
      aiActiveState.value = withTiming(0, { duration: 250 });
    }
  }, [isListening]);

  const handlePressIn = () => {
    runOnJS(triggerHaptics)('heavy');
    pressScale.value = withTiming(0.90, { duration: 70 });
  };

  const handlePressOut = () => {
    pressScale.value = withSpring(1, { damping: 12, stiffness: 280, mass: 0.7 });
  };

  // Styles
  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
    shadowOpacity: isListening ? 0.4 : 0.25,
    shadowRadius: isListening ? 30 : 20,
  }));

  return (
    <View style={styles.tabItem} pointerEvents="box-none">
      <View style={{ position: 'absolute', top: -36, width: 72, height: 72, zIndex: 100 }} pointerEvents="box-none">

        {/* Main 72px Button */}
        <Animated.View style={[styles.aiButtonCircleLarge, btnStyle]}>
          <TouchableOpacity 
            activeOpacity={1} 
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={styles.btnCenter}
          >
            <Ionicons name="mic" size={30} color="#FFF" style={{ left: 0, top: 0 }} />
          </TouchableOpacity>
        </Animated.View>

      </View>
      <View pointerEvents="none" style={{ height: 24, width: 24 }} />
      <Text pointerEvents="none" style={[styles.tabLabel, { color: '#4B5563' }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

// ─── Standard Tab Icon ───────────────────────────────────────────────────────

function TabIcon({
  name,
  label,
  focused,
  tabName,
  aiActiveState,
}: {
  name: any;
  label: string;
  focused: boolean;
  tabName: string;
  aiActiveState: SharedValue<number>;
}) {
  const color = focused ? EMERALD : '#9CA3AF';
  
  // Magnetic Tab Effect
  const animatedStyle = useAnimatedStyle(() => {
    let tx = 0;
    if (tabName === 'categories') {
      tx = interpolate(aiActiveState.value, [0, 1], [0, -12]);
    } else if (tabName === 'orders') {
      tx = interpolate(aiActiveState.value, [0, 1], [0, 12]);
    } else if (tabName === 'index') {
      tx = interpolate(aiActiveState.value, [0, 1], [0, -18]);
    } else if (tabName === 'profile') {
      tx = interpolate(aiActiveState.value, [0, 1], [0, 18]);
    }
    return {
      transform: [{ translateX: tx }],
      opacity: interpolate(aiActiveState.value, [0, 1], [1, 0.4])
    };
  });

  return (
    <Animated.View style={[styles.tabItem, animatedStyle]}>
      <Ionicons name={name} size={24} color={color} />
      <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </Animated.View>
  );
}

// ─── Layout Component ────────────────────────────────────────────────────────

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const bottomPad = Platform.OS === 'ios' ? insets.bottom : 16;
  const tabHeight = 65 + bottomPad;

  const aiActiveState = useSharedValue(0);

  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const fetchCart = useCartStore(state => state.fetchCart);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    }
  }, [isAuthenticated]);

  const centerX = W / 2;
  const notchRadius = 42; // Larger to fit 72px button
  
  const path = `
    M 0 0
    L ${centerX - notchRadius - 15} 0
    C ${centerX - notchRadius} 0, ${centerX - notchRadius} ${notchRadius}, ${centerX} ${notchRadius}
    C ${centerX + notchRadius} ${notchRadius}, ${centerX + notchRadius} 0, ${centerX + notchRadius + 15} 0
    L ${W} 0
    L ${W} ${tabHeight}
    L 0 ${tabHeight} Z
  `;

  return (
    <>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: 'transparent',
          position: 'absolute',
          borderTopWidth: 0,
          elevation: 0,
          height: tabHeight,
          bottom: 0,
        },
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, styles.svgShadow]}>
            <Image 
              source={require('@/assets/images/scooty.png')} 
              style={{
                position: 'absolute',
                top: -30,
                alignSelf: 'center',
                width: 150,
                height: 90,
              }}
              resizeMode="contain"
            />
            <Svg width={W} height={tabHeight} viewBox={`0 0 ${W} ${tabHeight}`}>
              <Path d={path} fill="#FFFFFF" />
            </Svg>
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'home' : 'home-outline'} label={t('tabs.home')} focused={focused} tabName="index" aiActiveState={aiActiveState} />,
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'grid' : 'grid-outline'} label={t('tabs.categories')} focused={focused} tabName="categories" aiActiveState={aiActiveState} />,
        }}
      />
      <Tabs.Screen
        name="ai-assistant"
        options={{
          tabBarButton: (props) => (
            <TouchableOpacity 
              {...(props as any)} 
              activeOpacity={1} 
              style={{ flex: 1 }}
            >
              <AIButton label={t('tabs.aiAssistant')} aiActiveState={aiActiveState} />
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'document-text' : 'document-text-outline'} label={t('tabs.orders')} focused={focused} tabName="orders" aiActiveState={aiActiveState} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'person' : 'person-outline'} label={t('tabs.profile')} focused={focused} tabName="profile" aiActiveState={aiActiveState} />,
        }}
      />
    </Tabs>
    <GlobalAIOverlay />
    </>
  );
}

const styles = StyleSheet.create({
  svgShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 12,
    width: W / 5,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    width: '95%',
  },
  
  aiButtonCircleLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: EMERALD,
    shadowColor: EMERALD,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    height: 72,
  },
  absoluteCenter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
  },

});
