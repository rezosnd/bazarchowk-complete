import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, withSpring } from 'react-native-reanimated';
import { useAIStore } from '@/store/aiStore';
import api from '@/services/api';

let Speech: any = null;
let Audio: any = null;
let FileSystem: any = null;

try {
  Speech = require('expo-speech');
  Audio = require('expo-audio');
  FileSystem = require('expo-file-system');
} catch (e) {
  console.log('Voice packages not available in Expo Go');
}

export function VoiceChatOverlay() {
  const { t, i18n } = useTranslation();
  const { isListening, stopListening } = useAIStore();
  const greeting = t('ai.greeting', { defaultValue: 'How can I help you today?' });
  const [aiResponse, setAiResponse] = useState('');
  const [processing, setProcessing] = useState(false);
  const [recording, setRecording] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const router = useRouter();

  const sheetY = useSharedValue(Dimensions.get('window').height);
  const bgOpacity = useSharedValue(0);
  const rippleScale1 = useSharedValue(1);
  const rippleOpacity1 = useSharedValue(0);
  const rippleScale2 = useSharedValue(1);
  const rippleOpacity2 = useSharedValue(0);

  useEffect(() => {
    if (isListening) {
      bgOpacity.value = withTiming(1, { duration: 300 });
      sheetY.value = withSpring(0, { damping: 20, stiffness: 100 });
      if (Speech) {
        const langCode = i18n.language === 'en' ? 'en-IN' : `${i18n.language}-IN`;
        Speech.speak(greeting, { language: langCode, rate: 0.9 });
      }
    } else {
      bgOpacity.value = withTiming(0, { duration: 300 });
      sheetY.value = withTiming(Dimensions.get('window').height, { duration: 300 });
      if (isRecording) {
        stopRecordingAndSubmit();
      }
    }
  }, [isListening]);

  useEffect(() => {
    if (isRecording) {
      rippleScale1.value = withRepeat(
        withSequence(withTiming(1.8, { duration: 1500, easing: Easing.out(Easing.ease) }), withTiming(1, { duration: 0 })),
        -1,
        false
      );
      rippleOpacity1.value = withRepeat(
        withSequence(withTiming(0, { duration: 1500, easing: Easing.out(Easing.ease) }), withTiming(0.4, { duration: 0 })),
        -1,
        false
      );
      
      setTimeout(() => {
        if (!isRecording) return;
        rippleScale2.value = withRepeat(
          withSequence(withTiming(1.8, { duration: 1500, easing: Easing.out(Easing.ease) }), withTiming(1, { duration: 0 })),
          -1,
          false
        );
        rippleOpacity2.value = withRepeat(
          withSequence(withTiming(0, { duration: 1500, easing: Easing.out(Easing.ease) }), withTiming(0.3, { duration: 0 })),
          -1,
          false
        );
      }, 750);
    } else {
      rippleScale1.value = 1;
      rippleOpacity1.value = 0;
      rippleScale2.value = 1;
      rippleOpacity2.value = 0;
    }
  }, [isRecording]);

  const handleClose = () => {
    if (isRecording) {
      stopRecordingAndSubmit();
    }
    sheetY.value = withTiming(Dimensions.get('window').height, { duration: 300 });
    bgOpacity.value = withTiming(0, { duration: 300 });
    setTimeout(() => {
      stopListening();
    }, 300);
  };

  const panResponder = React.useRef(
    require('react-native').PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderRelease: (evt: any, gestureState: any) => {
        if (gestureState.dy > 50) {
          handleClose();
        }
      },
    })
  ).current;

  const startRecording = async () => {
    try {
      if (Platform.OS === 'web') {
        alert('Voice ordering is not available on the web. Please use the mobile app.');
        return;
      }
      if (!Audio) {
        alert('Voice packages are not available in Expo Go. Please use a development build.');
        return;
      }
      setAiResponse('Listening...');
      await Audio.requestRecordingPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      
      const options = Audio.RecordingPresets.LOW_QUALITY;
      const platformOptions = Platform.OS === 'ios' ? { ...options, ...options.ios } : { ...options, ...options.android };
      const recorder = new Audio.AudioModule.AudioRecorder(platformOptions);
      
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecording(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
      setAiResponse('Microphone permission denied.');
    }
  };

  const stopRecordingAndSubmit = async () => {
    if (Platform.OS === 'web') return;
    setAiResponse('Thinking...');
    setIsRecording(false);
    if (!recording || !FileSystem || !Speech) return;

    setProcessing(true);
    try {
      await recording.stop();
      const uri = recording.uri;
      if (!uri) throw new Error('No audio URI');
      
      const audioBase64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      
      const sessionId = 'session_' + Math.random().toString(36).substr(2, 9);
      const langCode = i18n.language === 'en' ? 'en-IN' : `${i18n.language}-IN`;
      
      // Use process.env.EXPO_PUBLIC_API_URL safely
      const baseURL = process.env.EXPO_PUBLIC_API_URL || 'https://bazarchowk-complete.vercel.app';
      const res = await fetch(`${baseURL}/voice-ordering/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64, sessionId, language: langCode }),
      });
      
      if (!res.ok) {
         throw new Error('Something went wrong processing audio');
      }

      const data = await res.json();
      setAiResponse(data.aiVoiceReply);
      
      Speech.speak(data.aiVoiceReply, { language: langCode, rate: 0.9 });

      if (data.action === 'ADD_TO_CART' && data.cartResults?.length > 0) {
        setTimeout(() => router.push('/cart'), 3000); 
      } else if (data.action === 'BOOKED') {
        setTimeout(() => router.push('/appointments' as any), 3000);
      } else if (data.action === 'CONFIRM_ORDER' || data.orderPlaced) {
        setTimeout(() => router.push('/(tabs)/orders' as any), 3000);
      }
    } catch (e: any) {
      const errMessage = e.message || 'Something went wrong processing audio';
      setAiResponse(errMessage);
      const errLangCode = i18n.language === 'en' ? 'en-IN' : `${i18n.language}-IN`;
      Speech.speak(errMessage, { language: errLangCode });
    } finally {
      setProcessing(false);
      setRecording(null);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      await stopRecordingAndSubmit();
    } else {
      await startRecording();
    }
  };

  const animatedBgStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));
  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }));

  const animatedRipple1 = useAnimatedStyle(() => ({
    transform: [{ scale: rippleScale1.value }],
    opacity: rippleOpacity1.value,
  }));
  const animatedRipple2 = useAnimatedStyle(() => ({
    transform: [{ scale: rippleScale2.value }],
    opacity: rippleOpacity2.value,
  }));

  if (!isListening) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 99999, justifyContent: 'flex-end' }]}>
      <Animated.View style={[StyleSheet.absoluteFill, animatedBgStyle, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
        <BlurView intensity={25} style={StyleSheet.absoluteFill} tint="dark" />
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} activeOpacity={1} />
      </Animated.View>
      
      <Animated.View 
        {...panResponder.panHandlers}
        style={[
          animatedSheetStyle, 
          { 
            height: '65%', 
            backgroundColor: '#FFF', 
            borderTopLeftRadius: 28, 
            borderTopRightRadius: 28, 
            padding: 24,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -10 },
            shadowOpacity: 0.1,
            shadowRadius: 20,
            elevation: 10,
          }
        ]}
      >
        <View style={{ width: 40, height: 5, borderRadius: 2.5, backgroundColor: '#E5E7EB', marginBottom: 40 }} />
        
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}>
          
          <Text style={{ fontSize: 24, fontWeight: '600', color: '#111827', textAlign: 'center', marginBottom: 60, paddingHorizontal: 20, minHeight: 60 }}>
            {aiResponse}
          </Text>

          <View style={{ justifyContent: 'center', alignItems: 'center' }}>
            <Animated.View style={[animatedRipple1, { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(59, 130, 246, 0.4)' }]} />
            <Animated.View style={[animatedRipple2, { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(59, 130, 246, 0.4)' }]} />
            
            <TouchableOpacity 
              style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: isRecording ? 'rgba(59, 130, 246, 1)' : '#111827', justifyContent: 'center', alignItems: 'center', zIndex: 10, shadowColor: isRecording ? '#3B82F6' : '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 }} 
              onPress={toggleRecording}
              disabled={processing}
            >
              {processing ? <ActivityIndicator size="large" color="#FFF" /> : <Ionicons name="mic" size={42} color="#FFF" />}
            </TouchableOpacity>
          </View>
          
        </View>
      </Animated.View>
    </View>
  );
}
