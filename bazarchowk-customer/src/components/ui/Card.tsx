import { Text as AppText } from '@/components/TranslatedText';
import React from 'react';
import { StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { useTheme } from '@/hooks';
import { BorderRadius, FontSize, FontWeight, Shadow, Spacing } from '@/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  shadow?: keyof typeof Shadow;
}

export function Card({ children, style, padding = Spacing.base, shadow = 'sm' }: CardProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        Shadow[shadow],
        {
          backgroundColor: theme.card,
          borderColor: theme.cardBorder,
          padding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

interface BadgeProps {
  label: string;
  color?: string;
  bgColor?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Badge({ label, color = '#FFFFFF', bgColor, style, textStyle }: BadgeProps) {
  const theme = useTheme();
  return (
    <View
      style={[styles.badge, { backgroundColor: bgColor ?? theme.primarySurface }, style]}
    >
      <AppText style={[styles.badgeText, { color: color ?? theme.primary }, textStyle]}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.3,
  },
});
