import { Text as AppText } from '@/components/TranslatedText';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale } from './PressableScale';

interface HeaderProps {
  title: string;
  rightAction?: React.ReactNode;
  onBack?: () => void;
  showBack?: boolean;
}

export function Header({ title, rightAction, onBack, showBack = true }: HeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      <View style={styles.inner}>
        {showBack ? (
          <PressableScale onPress={handleBack} style={styles.backBtn} scaleTo={0.9}>
            <Feather name="arrow-left" size={24} color="#122018" />
          </PressableScale>
        ) : (
          <View style={styles.backBtnPlaceholder} />
        )}

        <AppText style={styles.title} numberOfLines={1}>{title}</AppText>

        <View style={styles.rightAction}>
          {rightAction}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EAF8F0',
    shadowColor: '#00B140',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 10,
  },
  inner: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  backBtnPlaceholder: {
    width: 44,
    height: 44,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#122018',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  rightAction: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
