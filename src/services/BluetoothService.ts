import {
  NativeEventEmitter,
  NativeModules,
  Platform,
  PermissionsAndroid,
  type EmitterSubscription,
} from 'react-native';
import BleManager from 'react-native-ble-manager';
import {Buffer} from 'buffer';
import {
  CHAT_SERVICE_UUID,
  TX_CHAR_UUID,
  RX_CHAR_UUID,
  DEVICE_NAME,
  TARGET_MTU,
} from '../constants/ble';
import type {BleDevice} from '../types';

const BleManagerModule = NativeModules.BleManager;
const emitter = new NativeEventEmitter(BleManagerModule);

// BLE characteristic property and permission flags
const PROPERTY_NOTIFY = 16;
const PROPERTY_WRITE = 8;
const PROPERTY_WRITE_NO_RESPONSE = 4;
const PERMISSION_READ = 1;
const PERMISSION_WRITE = 2;

class BluetoothServiceClass {
  private initialized = false;
  private connectedDeviceId: string | null = null;
  private role: 'host' | 'client' | null = null;
  private subscriptions: EmitterSubscription[] = [];

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }
    await BleManager.start({showAlert: false});
    this.initialized = true;
  }

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true; // iOS prompts via Info.plist
    }
    if (Platform.Version >= 31) {
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
      ]);
      return Object.values(results).every(
        r => r === PermissionsAndroid.RESULTS.GRANTED,
      );
    }
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }

  // ---- HOST MODE (BLE Peripheral / GATT Server) -------------------------

  async startHosting(): Promise<void> {
    this.role = 'host';
    await BleManager.addService(CHAT_SERVICE_UUID, true);
    // TX: host → client notifications
    await BleManager.addCharacteristic(
      CHAT_SERVICE_UUID,
      TX_CHAR_UUID,
      PROPERTY_NOTIFY,
      PERMISSION_READ,
    );
    // RX: client → host writes
    await BleManager.addCharacteristic(
      CHAT_SERVICE_UUID,
      RX_CHAR_UUID,
      PROPERTY_WRITE | PROPERTY_WRITE_NO_RESPONSE,
      PERMISSION_WRITE,
    );
    await BleManager.startAdvertising({
      name: DEVICE_NAME,
      serviceUUIDs: [CHAT_SERVICE_UUID],
    });
  }

  async stopHosting(): Promise<void> {
    await BleManager.stopAdvertising();
    this.role = null;
  }

  // ---- CLIENT MODE (BLE Central) ----------------------------------------

  async startScanning(onDevice: (d: BleDevice) => void): Promise<void> {
    const seen = new Set<string>();
    const sub = emitter.addListener('BleManagerDiscoverPeripheral', p => {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        onDevice({
          id: p.id,
          name: p.name ?? p.advertising?.localName ?? null,
          rssi: p.rssi ?? null,
        });
      }
    });
    this.subscriptions.push(sub);
    await BleManager.scan([CHAT_SERVICE_UUID], 15, false);
  }

  async stopScanning(): Promise<void> {
    await BleManager.stopScan();
  }

  async connectToDevice(deviceId: string): Promise<void> {
    this.role = 'client';
    await BleManager.connect(deviceId);
    await BleManager.retrieveServices(deviceId);
    if (Platform.OS === 'android') {
      await BleManager.requestMTU(deviceId, TARGET_MTU);
    }
    this.connectedDeviceId = deviceId;
    await BleManager.startNotification(
      deviceId,
      CHAT_SERVICE_UUID,
      TX_CHAR_UUID,
    );
  }

  // ---- MESSAGING --------------------------------------------------------

  async sendMessage(text: string): Promise<void> {
    const bytes = Array.from(Buffer.from(text, 'utf8'));
    if (this.role === 'host') {
      if (!this.connectedDeviceId) {
        throw new Error('No client connected');
      }
      await BleManager.sendNotification(
        this.connectedDeviceId,
        CHAT_SERVICE_UUID,
        TX_CHAR_UUID,
        bytes,
      );
    } else {
      if (!this.connectedDeviceId) {
        throw new Error('Not connected to host');
      }
      await BleManager.writeWithoutResponse(
        this.connectedDeviceId,
        CHAT_SERVICE_UUID,
        RX_CHAR_UUID,
        bytes,
        bytes.length,
      );
    }
  }

  // ---- EVENT SUBSCRIPTIONS ----------------------------------------------

  /** Client: messages arriving from host via TX notifications */
  onMessageReceived(cb: (text: string) => void): EmitterSubscription {
    return emitter.addListener(
      'BleManagerDidUpdateValueForCharacteristic',
      event => {
        cb(Buffer.from(event.value).toString('utf8'));
      },
    );
  }

  /** Host: messages arriving from client via RX writes */
  onClientWriteReceived(cb: (text: string) => void): EmitterSubscription {
    return emitter.addListener(
      'BleManagerDidReceiveCharacteristicWriteRequest',
      event => {
        this.connectedDeviceId = event.peripheral;
        cb(Buffer.from(event.value).toString('utf8'));
      },
    );
  }

  /** Host: a client has connected */
  onClientConnected(cb: (deviceId: string) => void): EmitterSubscription {
    return emitter.addListener('BleManagerConnectPeripheral', event => {
      this.connectedDeviceId = event.peripheral;
      cb(event.peripheral);
    });
  }

  onDeviceDisconnected(cb: (deviceId: string) => void): EmitterSubscription {
    return emitter.addListener('BleManagerDisconnectPeripheral', event => {
      if (this.connectedDeviceId === event.peripheral) {
        this.connectedDeviceId = null;
      }
      cb(event.peripheral);
    });
  }

  // ---- CLEANUP ----------------------------------------------------------

  async cleanup(): Promise<void> {
    this.subscriptions.forEach(s => s.remove());
    this.subscriptions = [];
    if (this.connectedDeviceId) {
      try {
        await BleManager.disconnect(this.connectedDeviceId);
      } catch (_) {}
      this.connectedDeviceId = null;
    }
    if (this.role === 'host') {
      try {
        await BleManager.stopAdvertising();
      } catch (_) {}
    }
    this.role = null;
  }

  getConnectedDeviceId() {
    return this.connectedDeviceId;
  }
  getRole() {
    return this.role;
  }
}

export default new BluetoothServiceClass();
