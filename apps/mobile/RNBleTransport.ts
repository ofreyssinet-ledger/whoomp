import {
  BleManager,
  Device,
  State as BleState,
  LogLevel,
  Subscription as BleSubscription,
} from 'react-native-ble-plx';
import {Platform, PermissionsAndroid} from 'react-native';
import {
  BehaviorSubject,
  filter,
  first,
  firstValueFrom,
  Observable,
  Subject,
  Subscription,
} from 'rxjs';
import {
  Transport,
  DiscoveredDevice,
  TransportConnectedDevice,
  BLEDeviceData,
} from '@whoomp/sdk';

/**
 * Base64 helpers for converting between Uint8Array and base64 strings.
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    arr[i] = binary.charCodeAt(i);
  }
  return arr;
}

function uint8ArrayToBase64(data: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}

/**
 * A React Native BLE transport implementation using react-native-ble-plx.
 */
export class ReactNativeBleTransport implements Transport {
  private manager: BleManager;

  private bleStateSubscription: BleSubscription | null = null;
  private currentBleState: BehaviorSubject<BleState> =
    new BehaviorSubject<BleState>(BleState.Unknown);

  constructor() {
    this.manager = new BleManager();
    this.bleStateSubscription = this.manager.onStateChange(state => {
      console.log('BLE state changed:', state);
      this.currentBleState.next(state);
    });
    this.manager.state().then(state => {
      console.log('Initial BLE state:', state);
      this.currentBleState.next(state);
    });
    this.manager.setLogLevel(LogLevel.Verbose);
  }

  destroy(): void {
    console.log('Destroying BLE manager...');
    this.manager
      .connectedDevices([BLEDeviceData.WHOOP_SERVICE])
      .then(devices => {
        devices.forEach(device => {
          console.log('Cancelling connection for device:', device.id);
          this.manager.cancelDeviceConnection(device.id);
        });
      });
    this.bleStateSubscription?.remove();
    this.manager.destroy();
    this.currentBleState.complete();
    console.log('BLE manager destroyed.');
  }

  helloWorld(): string {
    return 'Hello from React Native BLE Transport';
  }

  /**
   * Request necessary Bluetooth permissions on Android.
   */
  private async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      return true;
    }
    const apiLevel = parseInt(Platform.Version.toString(), 10);
    if (apiLevel < 31) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);
    return (
      result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] ===
        PermissionsAndroid.RESULTS.GRANTED &&
      result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] ===
        PermissionsAndroid.RESULTS.GRANTED &&
      result[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
        PermissionsAndroid.RESULTS.GRANTED
    );
  }

  /**
   * Scan for WHOOP devices and emit discovered devices as an array.
   */
  getDevices(): Observable<DiscoveredDevice[]> {
    return new Observable<DiscoveredDevice[]>(subscriber => {
      (async () => {
        const granted = await this.requestPermissions();
        if (!granted) {
          subscriber.error(new Error('Bluetooth permission not granted'));
          return;
        }

        // Wait for BLE powered on
        await firstValueFrom(
          this.currentBleState.pipe(
            filter(state => state === BleState.PoweredOn),
          ),
        );

        const discoveredMap = new Map<string, DiscoveredDevice>();
        console.log('Starting device scan...');
        this.manager
          .connectedDevices([BLEDeviceData.WHOOP_SERVICE])
          .then(devices => {
            devices.forEach(device => {
              console.log(
                'Cancelling connection for already connected device:',
                device.id,
              );
              this.manager.cancelDeviceConnection(device.id);
            });
          });

        this.manager.startDeviceScan(
          [BLEDeviceData.WHOOP_SERVICE],
          {allowDuplicates: true},
          (error, device) => {
            console.log('Device scan callback:', {error, device});
            if (error) {
              subscriber.error(error);
              return;
            }
            if (device && device.id) {
              const id = device.id;
              const name = device.name ?? 'Unknown Device';
              if (device.serviceUUIDs?.includes(BLEDeviceData.WHOOP_SERVICE)) {
                console.log(`Discovered WHOOP device: ${name} (${id})`, device);
                if (!discoveredMap.has(id)) {
                  discoveredMap.set(id, {id, name});
                  subscriber.next(Array.from(discoveredMap.values()));
                }
              }
            }
          },
        );
      })();

      // Teardown: stop scanning on unsubscribe
      return () => {
        console.log('Stopping device scan...');
        this.manager.stopDeviceScan();
      };
    });
  }

  /**
   * Connect to a device by ID and set up read/write/notifications.
   */
  async connectToDevice(
    id: string,
    onDisconnect: () => void,
  ): Promise<TransportConnectedDevice> {
    let isConnected = false;
    const serviceUUID = BLEDeviceData.WHOOP_SERVICE;

    // Connect and discover
    console.log(`Connecting to device: ${id}`);
    const device: Device = await this.manager.connectToDevice(id);
    console.log(
      `Discovering services and characteristics for device: ${device.id}`,
    );
    await device.discoverAllServicesAndCharacteristics();
    console.log(
      `Discovered services and characteristics for device: ${device.id}`,
    );

    // Subjects for each characteristic
    const cmdFromSubj = new Subject<Uint8Array>();
    const eventsSubj = new Subject<Uint8Array>();
    const dataSubj = new Subject<Uint8Array>();

    // Monitor characteristic updates
    const cmdFromSubscription = this.manager.monitorCharacteristicForDevice(
      id,
      serviceUUID,
      BLEDeviceData.WHOOP_CHAR_CMD_FROM_STRAP,
      (error, char) => {
        if (error) {
          console.error('Error monitoring CMD_FROM:', error);
          return;
        }
        if (char?.value) {
          cmdFromSubj.next(base64ToUint8Array(char.value));
        }
      },
    );

    const eventsSubscription = this.manager.monitorCharacteristicForDevice(
      id,
      serviceUUID,
      BLEDeviceData.WHOOP_CHAR_EVENTS_FROM_STRAP,
      (error, char) => {
        if (error) {
          console.error('Error monitoring EVENTS:', error);
          return;
        }
        if (char?.value) {
          eventsSubj.next(base64ToUint8Array(char.value));
        }
      },
    );

    const dataSubscription = this.manager.monitorCharacteristicForDevice(
      id,
      serviceUUID,
      BLEDeviceData.WHOOP_CHAR_DATA_FROM_STRAP,
      (error, char) => {
        if (error) {
          console.error('Error monitoring DATA:', error);
          return;
        }
        if (char?.value) {
          dataSubj.next(base64ToUint8Array(char.value));
        }
      },
    );

    // Handle disconnection
    const disconnectSub = this.manager.onDeviceDisconnected(
      device.id,
      (error, _) => {
        console.log('[ReactNativeBleTransport] Device disconnected:', error);
        isConnected = false;
        // Cleanup subscriptions
        cmdFromSubscription.remove();
        eventsSubscription.remove();
        dataSubscription.remove();
        disconnectSub.remove();
        onDisconnect();
      },
    );

    isConnected = true;

    return {
      id,
      name: device.name ?? 'Unknown Device',
      writeCommandToStrapCharacteristic: async (data: Uint8Array) => {
        const base64Data = uint8ArrayToBase64(data);
        await this.manager.writeCharacteristicWithResponseForDevice(
          id,
          serviceUUID,
          BLEDeviceData.WHOOP_CHAR_CMD_TO_STRAP,
          base64Data,
        );
      },
      commandFromStrapCharacteristicObservable: cmdFromSubj.asObservable(),
      eventsFromStrapCharacteristicObservable: eventsSubj.asObservable(),
      dataFromStrapCharacteristicObservable: dataSubj.asObservable(),
      disconnect: async () => {
        cmdFromSubscription.remove();
        eventsSubscription.remove();
        dataSubscription.remove();
        disconnectSub.remove();
        try {
          await this.manager.cancelDeviceConnection(id);
          onDisconnect();
        } catch (err) {
          console.error('Error during disconnect:', err);
        }
      },
      isConnected: () => isConnected,
    };
  }
}
