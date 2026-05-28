export interface Message {
  id: string;
  text: string;
  sender: 'me' | 'them';
  timestamp: number;
}

export interface BleDevice {
  id: string;
  name: string | null;
  rssi: number | null;
}

export type RootStackParamList = {
  Home: undefined;
  Scan: undefined;
  Chat: {deviceId: string; deviceName: string; role: 'host' | 'client'};
};
