import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../types';
import bluetoothService from '../services/BluetoothService';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({navigation}: Props) {
  const [initializing, setInitializing] = useState(true);
  const [hosting, setHosting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await bluetoothService.init();
        const ok = await bluetoothService.requestPermissions();
        if (!ok) {
          Alert.alert(
            'Permission Required',
            'Bluetooth permissions are required to use this app.',
          );
        }
      } finally {
        setInitializing(false);
      }
    })();
    return () => {
      bluetoothService.cleanup();
    };
  }, []);

  const handleHost = useCallback(async () => {
    setHosting(true);
    try {
      await bluetoothService.startHosting();
      const sub = bluetoothService.onClientConnected(deviceId => {
        sub.remove();
        setHosting(false);
        navigation.navigate('Chat', {
          deviceId,
          deviceName: 'Peer Device',
          role: 'host',
        });
      });
      Alert.alert(
        'Hosting…',
        'Waiting for another device to connect via Bluetooth.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: async () => {
              sub.remove();
              await bluetoothService.stopHosting();
              setHosting(false);
            },
          },
        ],
      );
    } catch {
      setHosting(false);
      Alert.alert('Error', 'Failed to start hosting. Is Bluetooth enabled?');
    }
  }, [navigation]);

  if (initializing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.initText}>Initializing Bluetooth…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroIcon}>&#x1F4E1;</Text>
        <Text style={styles.title}>Bluetooth Chat</Text>
        <Text style={styles.subtitle}>Offline peer-to-peer messaging</Text>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.btn, styles.btnHost]}
          onPress={handleHost}
          disabled={hosting}
          activeOpacity={0.85}>
          {hosting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.btnIcon}>&#x1F4FB;</Text>
              <Text style={styles.btnLabel}>Host Chat</Text>
              <Text style={styles.btnHint}>Broadcast &amp; wait for someone</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnJoin]}
          onPress={() => navigation.navigate('Scan')}
          activeOpacity={0.85}>
          <Text style={styles.btnIcon}>&#x1F50D;</Text>
          <Text style={styles.btnLabel}>Join Chat</Text>
          <Text style={styles.btnHint}>Scan for nearby hosts</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>Works 100% offline via BLE</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    padding: 24,
    justifyContent: 'space-between',
  },
  centered: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12},
  initText: {color: '#666', fontSize: 14},
  hero: {alignItems: 'center', marginTop: 60},
  heroIcon: {fontSize: 64},
  title: {fontSize: 28, fontWeight: '700', color: '#1C1C1E', marginTop: 16},
  subtitle: {fontSize: 15, color: '#8E8E93', marginTop: 8},
  buttons: {gap: 16},
  btn: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  btnHost: {backgroundColor: '#007AFF'},
  btnJoin: {backgroundColor: '#34C759'},
  btnIcon: {fontSize: 32},
  btnLabel: {fontSize: 20, fontWeight: '700', color: '#fff', marginTop: 8},
  btnHint: {fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4},
  footer: {textAlign: 'center', color: '#8E8E93', fontSize: 13},
});
