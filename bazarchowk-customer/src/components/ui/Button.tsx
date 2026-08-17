import { Text as AppText } from '@/components/TranslatedText';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/hooks';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/theme';
import { useScaleAnimation } from '@/hooks/use-animation';

const LOGO_SRC = require('@/assets/images/APP-ICON.png');

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
  textStyle,
  leftIcon,
  rightIcon,
}: ButtonProps) {
  const theme = useTheme();
  const { scale, press, release } = useScaleAnimation(1);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 400, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true })
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [loading, pulseAnim]);

  const isDisabled = disabled || loading;

  const sizeStyles: Record<ButtonSize, { height: number; fontSize: number; paddingH: number }> = {
    sm: { height: 40, fontSize: FontSize.sm, paddingH: Spacing.md },
    md: { height: 52, fontSize: FontSize.base, paddingH: Spacing.base },
    lg: { height: 60, fontSize: FontSize.md, paddingH: Spacing.xl },
  };

  const variantStyles: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
    primary: { bg: theme.primary, text: '#FFFFFF' },
    secondary: { bg: theme.secondary, text: '#FFFFFF' },
    outline: { bg: 'transparent', text: theme.primary, border: theme.primary },
    ghost: { bg: 'transparent', text: theme.primary },
    danger: { bg: '#EF4444', text: '#FFFFFF' },
  };

  const current = sizeStyles[size];
  const variantStyle = variantStyles[variant];

  return (
    <Animated.View style={{ transform: [{ scale }], width: fullWidth ? '100%' : undefined }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={press}
        onPressOut={release}
        disabled={isDisabled}
        activeOpacity={0.9}
        style={[
          styles.button,
          {
            backgroundColor: variantStyle.bg,
            height: current.height,
            paddingHorizontal: current.paddingH,
            borderColor: variantStyle.border ?? 'transparent',
            borderWidth: variantStyle.border ? 1.5 : 0,
            opacity: isDisabled ? 0.55 : 1,
          },
          style,
        ]}
      >
        {loading ? (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Image source={LOGO_SRC} style={{ width: 24, height: 24 }} contentFit="contain" />
          </Animated.View>
        ) : (
          <>
            {leftIcon}
            <AppText
              style={[
                styles.text,
                { color: variantStyle.text, fontSize: current.fontSize },
                textStyle,
              ]}
            >
              {title}
            </AppText>
            {rightIcon}
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  text: {
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.2,
  },
});
