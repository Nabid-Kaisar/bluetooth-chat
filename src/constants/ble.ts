// Nordic UART Service (NUS) — industry-standard BLE serial profile
export const CHAT_SERVICE_UUID = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E';
export const TX_CHAR_UUID = '6E400003-B5A3-F393-E0A9-E50E24DCCA9E'; // host → client (notify)
export const RX_CHAR_UUID = '6E400002-B5A3-F393-E0A9-E50E24DCCA9E'; // client → host (write)

export const DEVICE_NAME = 'BTChat';
export const SCAN_TIMEOUT_SEC = 15;
export const TARGET_MTU = 512;
