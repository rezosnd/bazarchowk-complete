import { Text as AppText } from '@/components/TranslatedText';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { io, Socket } from 'socket.io-client';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://bazarchowk-complete.vercel.app';

export default function ChatScreen() {
  const { id: conversationId, name: recipientName, type } = useLocalSearchParams();
  const router = useRouter();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    let newSocket: Socket;

    const setupChat = async () => {
      const token = await AsyncStorage.getItem('auth_token');
      
      newSocket = io(`${API_BASE}/chat`, {
        auth: { token },
        transports: ['websocket']
      });

      newSocket.on('connect', () => {
        newSocket.emit('joinConversation', { conversationId });
      });

      newSocket.on('newMessage', (msg) => {
        setMessages(prev => [...prev, msg]);
      });

      setSocket(newSocket);

      // Load initial messages from backend
      try {
        const userRes = await fetch(`${API_BASE}/users/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const user = await userRes.json();
        setCurrentUserId(user.id);

        const res = await fetch(`${API_BASE}/communication/conversations/${conversationId}/messages`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data && Array.isArray(data.data)) {
          setMessages(data.data);
        }
      } catch (e) {
        console.error('Failed to load messages');
      }
    };

    setupChat();

    return () => {
      if (newSocket) {
        newSocket.emit('leaveConversation', { conversationId });
        newSocket.disconnect();
      }
    };
  }, [conversationId]);

  const sendMessage = () => {
    if (!inputText.trim() || !socket) return;
    
    socket.emit('sendMessage', {
      conversationId,
      content: inputText,
      attachments: []
    });
    
    setInputText('');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View>
          <AppText style={styles.headerTitle}>{recipientName}</AppText>
          <AppText style={styles.headerSubtitle}>{type === 'SUPPORT' ? 'BazarChowk Support' : 'Live Chat'}</AppText>
        </View>
        <TouchableOpacity style={styles.callButton}>
          <Ionicons name="call" size={20} color="#22c55e" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messageContainer}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        <AppText style={styles.encryptionNotice}>🔒 Messages are secured by end-to-end encryption</AppText>
        
        {messages.map((m, idx) => {
          const isMine = m.senderId === currentUserId; 
          return (
            <View key={idx} style={[styles.messageWrapper, isMine ? styles.myMessageWrapper : styles.theirMessageWrapper]}>
              <View style={[styles.messageBubble, isMine ? styles.myBubble : styles.theirBubble]}>
                <AppText style={[styles.messageText, isMine ? styles.myMessageText : styles.theirMessageText]}>
                  {m.content}
                </AppText>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.attachButton}>
          <Ionicons name="add-circle-outline" size={28} color="#6b7280" />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity 
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim()}
        >
          <Ionicons name="send" size={20} color="#fff" style={{ marginLeft: 2 }} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6'
  },
  backButton: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center' },
  headerSubtitle: { fontSize: 12, color: '#6b7280', textAlign: 'center' },
  callButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EAF8F0', alignItems: 'center', justifyContent: 'center' },
  messageContainer: { flex: 1 },
  encryptionNotice: { textAlign: 'center', fontSize: 12, color: '#9ca3af', marginBottom: 16 },
  messageWrapper: { flexDirection: 'row', width: '100%' },
  myMessageWrapper: { justifyContent: 'flex-end' },
  theirMessageWrapper: { justifyContent: 'flex-start' },
  messageBubble: { maxWidth: '75%', padding: 12, borderRadius: 20 },
  myBubble: { backgroundColor: '#22c55e', borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderBottomLeftRadius: 4 },
  messageText: { fontSize: 15, lineHeight: 20 },
  myMessageText: { color: '#fff' },
  theirMessageText: { color: '#1f2937' },
  inputContainer: { 
    flexDirection: 'row', alignItems: 'flex-end',
    padding: 12, paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6'
  },
  attachButton: { padding: 8, paddingBottom: 10 },
  input: { 
    flex: 1, minHeight: 40, maxHeight: 100,
    backgroundColor: '#f3f4f6', borderRadius: 20,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10,
    fontSize: 15, marginRight: 12
  },
  sendButton: { 
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center'
  },
  sendButtonDisabled: { backgroundColor: '#9ca3af' }
});
