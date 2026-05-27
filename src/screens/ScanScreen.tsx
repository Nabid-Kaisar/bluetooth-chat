import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {BleDevice, RootStackParamList} from '../types';
import bluetoothService from '../services/BluetoothService';

type Props = NativeStackScreenProps<RootStackParamList, 'Scan'>;

export default function ScanScreen({navigation}: Props) {
  const [devices, setDevices] = useState<BleDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);

  const startScan = useCallback(async () => {
    setDevices([]);
    setScanning(true);
    await bluetoothService.startScanning(device => {
      setDevices(prev =>
        prev.find(d => d.id === device.id) ? prev : [...prev, device],
      );
    });
    setTimeout(() => setScanning(false), 15_000);
  }, []);

  useEffect(() => {
    startScan();
    return () => {
      bluetoothService.stopScanning();
    };
  }, [startScan]);

  const handleConnect = async (device: BleDevice) => {
    setConnecting(device.id);
    await bluetoothService.stopScanning();
    try {
      await bluetoothService.connectToDevice(device.id);
      navigation.replace('Chat', {
        deviceId: device.id,
        deviceName: device.name ?? device.id,
        role: 'client',
      });
    } catch {
      Alert.alert('Connection Failed', 'Could not connect. Please try again.');
      setConnecting(null);
    }
  };

  const renderDevice = ({item}: {item: BleDevice}) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => handleConnect(item)}
      disabled={connecting !== null}
      activeOpacity={0.7}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name ?? 'Unknown Device'}</Text>
        <Text style={styles.itemId} numberOfLines={1}>
          {item.id}
        </Text>
      </View>
      <View style={styles.itemRight}>
        {connecting === item.id ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : (
          <>
            <Text style={styles.rssi}>{item.rssi ?? '--'} dBm</Text>
            <Text style={styles.connectLabel}>Connect</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.hint}>Looking for nearby BTChat hosts…</Text>
        {scanning && (
          <View style={styles.scanRow}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.scanText}>Scanning</Text>
          </View>
        )}
      </View>

      <FlatList
        data={devices}
        keyExtractor={d => d.id}
        renderItem={renderDevice}
        contentContainerStyle={devices.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>&#x1F4E1;</Text>
            <Text style={styles.emptyText}>
              {scanning ? 'Searching for devices…' : 'No devices found'}
            </Text>
            {!scanning && (
              <TouchableOpacity style={styles.retryBtn} onPress={startScan}>
                <Text style={styles.retryText}>Scan Again</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F2F2F7'},
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  hint: {fontSize: 14, color: '#8E8E93'},
  scanRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8},
  scanText: {fontSize: 13, color: '#007AFF'},
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  itemInfo: {flex: 1},
  itemName: {fontSize: 16, fontWeight: '600', color: '#1C1C1E'},
  itemId: {fontSize: 11, color: '#8E8E93', marginTop: 2},
  itemRight: {alignItems: 'flex-end', gap: 4},
  rssi: {fontSize: 12, color: '#8E8E93'},
  connectLabel: {fontSize: 14, color: '#007AFF', fontWeight: '600'},
  emptyContainer: {flex: 1},
  empty: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40},
  emptyIcon: {fontSize: 48},
  emptyText: {fontSize: 16, color: '#8E8E93', marginTop: 12, textAlign: 'center'},
  retryBtn: {
    marginTop: 20,
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  retryText: {color: '#fff', fontWeight: '600'},
});
