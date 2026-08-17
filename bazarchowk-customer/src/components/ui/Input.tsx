import { Text as AppText } from '@/components/TranslatedText';
import React, { forwardRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/hooks';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  required?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    { label, error, hint, leftIcon, rightIcon, containerStyle, required, style, ...props },
    ref
  ) => {
    const theme = useTheme();
    const [focused, setFocused] = useState(false);

    const borderColor = error
      ? '#EF4444'
      : focused
        ? theme.primary
        : theme.border;

    return (
      <View style={[styles.container, containerStyle]}>
        {label && (
          <AppText style={[styles.label, { color: theme.text }]}>
            {label}
            {required && <AppText style={{ color: '#EF4444' }}> *</AppText>}
          </AppText>
        )}

        <View
          style={[
            styles.inputWrap,
            {
              backgroundColor: theme.backgroundSecondary,
              borderColor,
              borderWidth: focused || error ? 2 : 1,
            },
          ]}
        >
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}

          <TextInput
            ref={ref}
            style={[
              styles.input,
              {
                color: theme.text,
                paddingLeft: leftIcon ? 0 : Spacing.base,
                paddingRight: rightIcon ? 0 : Spacing.base,
              },
              style,
            ]}
            placeholderTextColor={theme.placeholder}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            {...props}
          />

          {rightIcon && <TouchableOpacity style={styles.iconRight}>{rightIcon}</TouchableOpacity>}
        </View>

        {error && <AppText style={styles.error}>{error}</AppText>}
        {!error && hint && <AppText style={[styles.hint, { color: theme.textTertiary }]}>{hint}</AppText>}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    letterSpacing: 0.2,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    height: 52,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: FontSize.base,
    paddingVertical: 0,
  },
  iconLeft: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRight: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    fontSize: FontSize.xs,
    color: '#EF4444',
    fontWeight: FontWeight.medium,
  },
  hint: {
    fontSize: FontSize.xs,
  },
});
