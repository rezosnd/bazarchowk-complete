import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Modal, ScrollView, Platform, Dimensions, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring, 
  runOnJS,
  withSequence,
} from 'react-native-reanimated';

const { width: W, height: H } = Dimensions.get('window');

const EMERALD = '#00B140';
const TEXT_MAIN = '#111827';
const TEXT_MUTED = '#6B7280';

const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'ur', name: 'Urdu', native: 'اردو' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ' },
];

function LanguageCard({ lang, isSelected, onPress }: { lang: typeof LANGUAGES[0], isSelected: boolean, onPress: () => void }) {
  const scale = useSharedValue(1);
  const selectionScale = useSharedValue(isSelected ? 1 : 0);

  useEffect(() => {
    selectionScale.value = withSpring(isSelected ? 1 : 0, {
      damping: 14, stiffness: 200, mass: 0.8
    });
  }, [isSelected]);

  const handlePressIn = () => {
    scale.value = withTiming(0.96, { duration: 100 });
  };
  const handlePressOut = () => {
    scale.value = withSequence(
      withTiming(1.02, { duration: 120 }),
      withTiming(1, { duration: 100 })
    );
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: isSelected ? EMERALD : '#F3F4F6',
    backgroundColor: isSelected ? 'rgba(0, 177, 64, 0.04)' : '#FFFFFF',
    borderWidth: isSelected ? 2 : 1,
    shadowColor: EMERALD,
    shadowOpacity: isSelected ? 0.08 : 0,
    shadowRadius: isSelected ? 12 : 0,
    shadowOffset: { width: 0, height: 6 },
    elevation: isSelected ? 4 : 0,
  }));

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ scale: selectionScale.value }],
    opacity: selectionScale.value
  }));

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
    >
      <Animated.View style={[styles.langCard, animatedStyle]}>
        <View style={styles.langCardLeft}>
          <Text style={[styles.langNative, isSelected && { color: EMERALD }]}>{lang.native}</Text>
          <Text style={styles.langName}>{lang.name}</Text>
        </View>
        <View style={[styles.radioCircle, isSelected && { borderColor: EMERALD }]}>
          <Animated.View style={[styles.radioFill, indicatorStyle]} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

export function LanguageSelector() {
  const { i18n } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);
  const [tempLang, setTempLang] = useState(i18n.language || 'en');

  const sheetY = useSharedValue(H);
  const sheetOpacity = useSharedValue(0.7);
  const sheetScale = useSharedValue(0.98);
  const bgOpacity = useSharedValue(0);
  
  const btnScale = useSharedValue(1);

  const openSheet = () => {
    setTempLang(i18n.language || 'en');
    setModalVisible(true);
    
    bgOpacity.value = 0;
    sheetOpacity.value = 0.7;
    sheetScale.value = 0.98;
    sheetY.value = H;

    requestAnimationFrame(() => {
      bgOpacity.value = withTiming(1, { duration: 350 });
      sheetOpacity.value = withTiming(1, { duration: 350 });
      sheetScale.value = withTiming(1, { duration: 350 });
      sheetY.value = withSpring(0, {
        damping: 16, stiffness: 220, mass: 0.8
      });
    });
  };

  const closeSheet = () => {
    bgOpacity.value = withTiming(0, { duration: 300 });
    sheetOpacity.value = withTiming(0, { duration: 300 });
    sheetY.value = withSpring(H, {
      damping: 20, stiffness: 200, mass: 1
    }, () => {
      runOnJS(setModalVisible)(false);
    });
  };

  const confirmSelection = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    i18n.changeLanguage(tempLang);
    closeSheet();
  };

  const handleBtnPressIn = () => {
    btnScale.value = withTiming(0.97, { duration: 150 });
  };
  const handleBtnPressOut = () => {
    btnScale.value = withTiming(1, { duration: 150 });
  };

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: sheetY.value },
      { scale: sheetScale.value }
    ],
    opacity: sheetOpacity.value
  }));

  const bgAnimatedStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value
  }));

  const btnAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }]
  }));

  return (
    <>
      <TouchableOpacity style={styles.langChip} activeOpacity={0.7} onPress={openSheet}>
        <Ionicons name="language" size={16} color={EMERALD} />
        <Text style={styles.langChipText}>{i18n.language ? i18n.language.toUpperCase() : 'EN'}</Text>
        <Ionicons name="chevron-down" size={14} color={TEXT_MUTED} />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="none" onRequestClose={closeSheet}>
        <View style={styles.modalOverlay}>
          <Animated.View style={[StyleSheet.absoluteFill, bgAnimatedStyle]}>
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeSheet} />
          </Animated.View>
          
          <Animated.View style={[styles.sheetContainer, sheetAnimatedStyle]}>
            <View style={styles.dragIndicator} />
            
            <View style={styles.header}>
              <View style={styles.iconCircle}>
                <Ionicons name="language" size={24} color={EMERALD} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>App Language</Text>
                <Text style={styles.sheetSubtitle}>Choose your preferred language</Text>
              </View>
            </View>
            
            <ScrollView style={styles.langList} contentContainerStyle={styles.langListContent} showsVerticalScrollIndicator={false}>
              {LANGUAGES.map((lang) => (
                <LanguageCard
                  key={lang.code}
                  lang={lang}
                  isSelected={tempLang === lang.code}
                  onPress={() => setTempLang(lang.code)}
                />
              ))}
            </ScrollView>
            
            <View style={styles.footer}>
              <Pressable 
                onPressIn={handleBtnPressIn} 
                onPressOut={handleBtnPressOut}
                onPress={confirmSelection}
              >
                <Animated.View style={[styles.confirmBtn, btnAnimatedStyle]}>
                  <Text style={styles.confirmBtnText}>Continue</Text>
                </Animated.View>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3FAF5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 177, 64, 0.2)',
    gap: 6,
  },
  langChipText: {
    fontSize: 13,
    fontWeight: '800',
    color: EMERALD,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: H * 0.7, 
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 40,
  },
  dragIndicator: {
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
    gap: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 177, 64, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: TEXT_MAIN,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  langList: {
    flex: 1,
  },
  langListContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 12,
  },
  langCard: {
    height: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  langCardLeft: {
    flexDirection: 'column',
    gap: 2,
  },
  langNative: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_MAIN,
  },
  langName: {
    fontSize: 13,
    color: TEXT_MUTED,
    fontWeight: '500',
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#DADADA',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF'
  },
  radioFill: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: EMERALD,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  confirmBtn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: EMERALD,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: EMERALD,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
