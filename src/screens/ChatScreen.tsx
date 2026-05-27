import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {v4 as uuidv4} from 'uuid';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {Message, RootStackParamList} from '../types';
import bluetoothService from '../services/BluetoothService';
import MessageBubble from '../components/MessageBubble';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export default function ChatScreen({route, navigation}: Props) {
  const {deviceId, deviceName, role} = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [connected, setConnected] = useState(true);
  const listRef = useRef<FlatList>(null);

  const addMessage = useCallback((text: string, sender: 'me' | 'them') => {
    setMessages(prev => [
      ...prev,
      {id: uuidv4(), text, sender, timestamp: Date.now()},
    ]);
    setTimeout(() => listRef.current?.scrollToEnd({animated: true}), 80);
  }, []);

  useEffect(() => {
    navigation.setOptions({title: deviceName});

    const disconnectSub = bluetoothService.onDeviceDisconnected(id => {
      if (id === deviceId) {
        setConnected(false);
        Alert.alert('Disconnected', 'The other device has disconnected.', [
          {text: 'Go Back', onPress: () => navigation.goBack()},
        ]);
      }
    });

    const msgSub =
      role === 'client'
        ? bluetoothService.onMessageReceived(t => addMessage(t, 'them'))
        : bluetoothService.onClientWriteReceived(t => addMessage(t, 'them'));

    return () => {
      disconnectSub.remove();
      msgSub.remove();
    };
  }, [navigation, deviceId, deviceName, role, addMessage]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !connected) {
      return;
    }
    setInputText('');
    try {
      await bluetoothService.sendMessage(text);
      addMessage(text, 'me');
    } catch {
      Alert.alert('Send Failed', 'Could not send the message.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}>
      {!connected && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Disconnected</Text>
        </View>
      )}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        renderItem={({item}) => <MessageBubble message={item} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatText}>Say hello!</Text>
          </View>
        }
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message…"
          placeholderTextColor="#8E8E93"
          multiline
          maxLength={500}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            (!inputText.trim() || !connected) && styles.sendBtnDisabled,
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || !connected}>
          <Text style={styles.sendIcon}>↑</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.endBtn}
        onPress={() =>
          Alert.alert('End Session', 'Disconnect and leave the chat?', [
            {text: 'Cancel', style: 'cancel'},
            {
              text: 'Disconnect',
              style: 'destructive',
              onPress: async () => {
                await bluetoothService.cleanup();
                navigation.navigate('Home');
              },
            },
          ])
        }>
        <Text style={styles.endText}>End Session</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F2F2F7'},
  banner: {backgroundColor: '#FF3B30', padding: 8, alignItems: 'center'},
  bannerText: {color: '#fff', fontWeight: '600'},
  list: {padding: 16, flexGrow: 1},
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyChatText: {color: '#8E8E93', fontSize: 16},
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#C6C6C8',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    color: '#1C1C1E',
    marginRight: 8,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {backgroundColor: '#C7C7CC'},
  sendIcon: {color: '#fff', fontSize: 18, fontWeight: '700'},
  endBtn: {padding: 12, alignItems: 'center'},
  endText: {color: '#FF3B30', fontSize: 14},
});
