import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

export default function AIAssistant() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  
  const [messages, setMessages] = useState<{id: string, text: string, isUser: boolean}[]>([
    { id: '1', text: 'Hello! I am your BazarChowk AI Assistant. How can I help you today? You can ask me to find products, book services, or check your orders.', isUser: false }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    const userMsg = input.trim();
    setMessages(prev => [...prev, { id: Date.now().toString(), text: userMsg, isUser: true }]);
    setInput('');
    setLoading(true);

    // Simulate AI response
    setTimeout(() => {
      let aiResponse = "I'm still learning! But I can help you search for items. Try going to the search page.";
      
      const lower = userMsg.toLowerCase();
      if (lower.includes('milk') || lower.includes('bread') || lower.includes('grocery')) {
        aiResponse = "I found some fresh groceries for you! Would you like me to add Milk and Bread to your cart?";
      } else if (lower.includes('plumb') || lower.includes('salon') || lower.includes('service')) {
        aiResponse = "We have top-rated professionals nearby. Should I open the Services section for you?";
      } else if (lower.includes('order') || lower.includes('track')) {
        aiResponse = "You can track your live orders in the Orders tab. Would you like to go there now?";
      }

      setMessages(prev => [...prev, { id: Date.now().toString(), text: aiResponse, isUser: false }]);
      setLoading(false);
    }, 1500);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#00B140', '#00752A']} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Assistant</Text>
          <View style={{ width: 24 }} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={styles.chatScroll}
          showsVerticalScrollIndicator={false}
        >
          {messages.map(msg => (
            <View key={msg.id} style={[styles.messageBubble, msg.isUser ? styles.userBubble : styles.aiBubble]}>
              {!msg.isUser && (
                <View style={styles.aiAvatar}>
                  <Ionicons name="sparkles" size={14} color="#FFF" />
                </View>
              )}
              <View style={[styles.messageContent, msg.isUser ? styles.userContent : styles.aiContent]}>
                <Text style={[styles.messageText, msg.isUser ? styles.userText : styles.aiText]}>
                  {msg.text}
                </Text>
              </View>
            </View>
          ))}
          {loading && (
            <View style={[styles.messageBubble, styles.aiBubble]}>
              <View style={styles.aiAvatar}>
                <Ionicons name="sparkles" size={14} color="#FFF" />
              </View>
              <View style={[styles.messageContent, styles.aiContent]}>
                <ActivityIndicator color="#00B140" size="small" />
              </View>
            </View>
          )}
        </ScrollView>

        <View style={[styles.inputContainer, { paddingBottom: insets.bottom || 16 }]}>
          <TextInput
            style={styles.input}
            placeholder="Ask me anything..."
            placeholderTextColor="#9CA3AF"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <TouchableOpacity 
            style={[styles.sendBtn, !input.trim() && { opacity: 0.5 }]} 
            onPress={handleSend}
            disabled={!input.trim()}
          >
            <Ionicons name="send" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3FAF5' },
  header: { paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  chatScroll: { padding: 20, paddingBottom: 40, gap: 16 },
  messageBubble: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 },
  userBubble: { justifyContent: 'flex-end' },
  aiBubble: { justifyContent: 'flex-start' },
  aiAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#00B140', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  messageContent: { maxWidth: '80%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  userContent: { backgroundColor: '#00B140', borderBottomRightRadius: 4 },
  aiContent: { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#E5E7EB' },
  messageText: { fontSize: 15, lineHeight: 22 },
  userText: { color: '#FFFFFF' },
  aiText: { color: '#111827' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderColor: '#E5E7EB' },
  input: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 12, fontSize: 16, color: '#111827', marginRight: 12 },
  sendBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#00B140', alignItems: 'center', justifyContent: 'center', shadowColor: '#00B140', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }
});