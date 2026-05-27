# Bluetooth Chat

A React Native app for **offline peer-to-peer chat** over Bluetooth Low Energy (BLE). No internet, no server — just two phones and Bluetooth.

---

## Feasibility Analysis

### TL;DR

| Scenario | Feasible? | Notes |
|---|---|---|
| Android ↔ Android | ✅ Full support | Classic BT + BLE both work |
| iOS ↔ iOS | ✅ Full support | BLE via CoreBluetooth |
| Android → iOS (Android joins, iOS hosts) | ✅ Works | Android central, iOS peripheral |
| iOS → Android (iOS joins, Android hosts) | ✅ Works | iOS central, Android peripheral |
| iOS ↔ Android (true cross-platform) | ⚠️ BLE only | Works but needs careful implementation |

**Bottom line: Yes, it is feasible on both iOS and Android using BLE.**

---

### 1. Bluetooth Technology Landscape

There are two kinds of Bluetooth relevant here:

**Classic Bluetooth (BR/EDR)**
- Higher bandwidth (~2 Mbps)
- Uses RFCOMM serial profile for data
- Android: full third-party access
- iOS: ❌ Apple blocks Classic Bluetooth for third-party apps entirely
- **Cannot be used for cross-platform chat**

**Bluetooth Low Energy (BLE)**
- Lower bandwidth (~0.27 Mbps), but more than enough for text
- Uses GATT (Generic Attribute Profile) client/server model
- Android: full support since API 18 (Android 4.3)
- iOS: full support via CoreBluetooth since iOS 7
- ✅ **This is the viable path for cross-platform Bluetooth chat**

---

### 2. BLE Architecture: How It Works

BLE operates in a **Peripheral (server) / Central (client)** model:

```
  ┌─────────────────────┐         ┌─────────────────────┐
  │   HOST DEVICE       │         │   CLIENT DEVICE     │
  │   (Peripheral)      │◄───────►│   (Central)         │
  │                     │         │                     │
  │  GATT Server        │         │  GATT Client        │
  │  ├─ Chat Service    │         │  ├─ Scans for UUID  │
  │  │  ├─ TX Char      │──────►  │  │  └─ Subscribes   │
  │  │  │  (notify)     │notifications  └─ Receives msgs│
  │  │  └─ RX Char      │◄──────  │                     │
  │  │     (write)      │ writes  │  Sends messages      │
  └─────────────────────┘         └─────────────────────┘
```

This app uses the **Nordic UART Service (NUS)** — an industry-standard BLE profile for serial-like communication:
- **TX Characteristic** (`6E400003-...`): Host → Client (notify)
- **RX Characteristic** (`6E400002-...`): Client → Host (write)

---

### 3. iOS Capabilities & Limitations

**What iOS allows:**
- ✅ BLE Central role (scanning, connecting, reading, writing, subscribing to notifications)
- ✅ BLE Peripheral role (advertising, GATT server, sending notifications)
- ✅ Background Bluetooth with `bluetooth-central` and `bluetooth-peripheral` capability flags

**What iOS blocks:**
- ❌ Classic Bluetooth (RFCOMM) for third-party apps — Apple restricts this
- ❌ Wi-Fi Direct (Apple has its own equivalent: Multipeer Connectivity)
- ❌ Peripheral mode is limited in background (can still send notifications, but advertising pauses)

**Key iOS requirement:** Must add to `Info.plist`:
```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>Used for offline chat</string>
<key>UIBackgroundModes</key>
<array>
  <string>bluetooth-central</string>
  <string>bluetooth-peripheral</string>
</array>
```

---

### 4. Android Capabilities & Limitations

**What Android allows:**
- ✅ Classic Bluetooth (RFCOMM) — full access
- ✅ BLE Central + Peripheral roles
- ✅ Wi-Fi Direct
- ✅ Background operation (with foreground service for reliability)

**Android permissions (varies by API level):**
```
API < 31 (Android 11-):  ACCESS_FINE_LOCATION + BLUETOOTH + BLUETOOTH_ADMIN
API >= 31 (Android 12+): BLUETOOTH_SCAN + BLUETOOTH_CONNECT + BLUETOOTH_ADVERTISE
```

**Android 12+ note:** `BLUETOOTH_SCAN` requires `android:usesPermissionFlags="neverForLocation"` if you don't need location inference.

---

### 5. Known Limitations

| Limitation | Impact | Mitigation |
|---|---|---|
| BLE MTU default 23 bytes | Messages > 20 chars need chunking | Request MTU increase to 512 bytes (implemented) |
| iOS peripheral background | Advertising pauses when app is backgrounded | Foreground service / wake on connect |
| BLE range ~10m indoors | Short distance only | Acceptable for co-located chat |
| 1-to-1 only | No group chat | Would need relay/mesh architecture |
| iOS peripheral requires CoreBluetooth native binding | Extra native module setup | `react-native-ble-manager` v11+ handles this |
| Android BLE peripheral needs API 21+ | Very old phones excluded | ~99%+ of active Android devices qualify |

---

### 6. Technology Stack Decision

```
Framework:  React Native CLI (not Expo — BLE requires native modules)
Language:   TypeScript
BLE lib:    react-native-ble-manager v11+  (central + peripheral on both platforms)
Navigation: @react-navigation/native-stack
```

Why `react-native-ble-manager` over alternatives:
- `react-native-ble-plx`: Central only, no peripheral support
- `react-native-bluetooth-classic`: Android only (Classic BT)
- `react-native-ble-manager` v11+: Both central AND peripheral, both iOS and Android ✅

---

### 7. Architecture Overview

```
App.tsx  (Navigation)
├── HomeScreen      →  Choose Host or Join
├── ScanScreen      →  BLE scan + device list (client mode)
└── ChatScreen      →  Message UI (both roles)

BluetoothService    →  Singleton service layer
├── Host mode       →  addService → addCharacteristic → startAdvertising
└── Client mode     →  scan → connect → requestMTU → startNotification
```

**Message flow:**
- Client sends: `write to RX characteristic` → host receives via `DidReceiveCharacteristicWriteRequest`
- Host sends: `sendNotification on TX characteristic` → client receives via `DidUpdateValueForCharacteristic`

---

## Setup & Build

### Prerequisites
- Node 18+
- React Native CLI environment (Xcode for iOS, Android Studio for Android)
- Physical devices (BLE doesn't work on simulators/emulators)

### Install
```bash
npm install
```

### iOS
```bash
cd ios && pod install && cd ..
npx react-native run-ios --device
```

### Android
```bash
npx react-native run-android
```

### Usage
1. Open app on both phones
2. Phone A: tap **Host Chat** → waits for connection
3. Phone B: tap **Join Chat** → scans → tap the found device
4. Chat screen opens on both — send messages offline!

---

## Project Structure

```
bluetoothchat/
├── src/
│   ├── screens/
│   │   ├── HomeScreen.tsx      # Role selection
│   │   ├── ScanScreen.tsx      # BLE device scanner
│   │   └── ChatScreen.tsx      # Chat UI
│   ├── services/
│   │   └── BluetoothService.ts # All BLE logic
│   ├── components/
│   │   └── MessageBubble.tsx   # Chat bubble component
│   ├── constants/
│   │   └── ble.ts              # UUIDs and constants
│   └── types/
│       └── index.ts            # TypeScript types
├── android/                    # Android native config
├── ios/                        # iOS native config
├── App.tsx                     # Navigation root
└── index.js                    # Entry point
```
