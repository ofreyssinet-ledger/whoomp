import {
  type Transport,
  type ConnectedDevice,
  type DiscoveredDevice,
  BLEDeviceData,
} from '@whoomp/sdk';
import { from, Observable, Subject } from 'rxjs';

class WebBleTransport implements Transport {
  helloWorld(): string {
    return 'Hello from Web BLE Transport';
  }

  getDevices(): Observable<DiscoveredDevice[]> {
    return from(
      navigator.bluetooth
        .requestDevice({
          filters: [{ services: [BLEDeviceData.WHOOP_SERVICE] }],
          optionalServices: [BLEDeviceData.WHOOP_SERVICE],
        })
        .then((device) => [
          {
            id: device.id,
            name: device.name || 'Unknown Device',
          },
        ]),
    );
  }

  private mapNotifyCharacteristicEventToUint8Array(event: Event): Uint8Array {
    const characteristic = event.target as BluetoothRemoteGATTCharacteristic;
    if (!characteristic.value) {
      throw new Error('Characteristic value is null');
    }
    return new Uint8Array(characteristic.value.buffer);
  }

  async connectToDevice(
    id: string,
    onDisconnect: () => void,
  ): Promise<ConnectedDevice> {
    let isConnected = false;
    // TODO: this function is experimental in the browser and may not work in all browsers
    const devices = await navigator.bluetooth.getDevices();
    const device = devices.find((d) => d.id === id);
    if (!device) {
      throw new Error(`Device with id ${id} not found`);
    }

    const server = await device.gatt?.connect();
    if (!server) {
      throw new Error(`Failed to connect to device ${id}`);
    }
    const service = await server.getPrimaryService(BLEDeviceData.WHOOP_SERVICE);
    console.log('Connected to service:', service.uuid);

    const [
      cmdToStrapChar,
      cmdFromStrapChar,
      eventsFromStrapChar,
      dataFromStrapChar,
    ] = await Promise.all([
      service.getCharacteristic(BLEDeviceData.WHOOP_CHAR_CMD_TO_STRAP),
      service.getCharacteristic(BLEDeviceData.WHOOP_CHAR_CMD_FROM_STRAP),
      service.getCharacteristic(BLEDeviceData.WHOOP_CHAR_EVENTS_FROM_STRAP),
      service.getCharacteristic(BLEDeviceData.WHOOP_CHAR_DATA_FROM_STRAP),
    ]);

    console.log('Characteristics retrieved:', {
      cmdToStrapChar: cmdToStrapChar.uuid,
      cmdFromStrapChar: cmdFromStrapChar.uuid,
      eventsFromStrapChar: eventsFromStrapChar.uuid,
      dataFromStrapChar: dataFromStrapChar.uuid,
    });

    // Start notifications for the characteristics
    await Promise.all([
      cmdFromStrapChar.startNotifications(),
      eventsFromStrapChar.startNotifications(),
      dataFromStrapChar.startNotifications(),
    ]);

    console.log('Notifications started for characteristics');

    const cmdFromStrapSubject = new Subject<Uint8Array>();
    const eventsFromStrapSubject = new Subject<Uint8Array>();
    const dataFromStrapSubject = new Subject<Uint8Array>();

    const map = new Map<BluetoothRemoteGATTCharacteristic, Subject<Uint8Array>>(
      [
        [cmdFromStrapChar, cmdFromStrapSubject],
        [eventsFromStrapChar, eventsFromStrapSubject],
        [dataFromStrapChar, dataFromStrapSubject],
      ],
    );

    // Register event listeners for each characteristic
    for (const [char, subject] of map.entries()) {
      char.addEventListener('characteristicvaluechanged', (event: Event) => {
        subject.next(this.mapNotifyCharacteristicEventToUint8Array(event));
      });
    }

    const handleDisconnection = () => {
      console.log(`Device ${device.id} disconnected`);
      isConnected = false;
      onDisconnect();
    };

    // Register the disconnect event handler
    device.addEventListener('gattserverdisconnected', handleDisconnection);

    isConnected = true;

    return {
      id: device.id,
      name: device.name || 'Unknown Device',
      writeCommandToStrapCharacteristic: async (data: Uint8Array) => {
        await cmdToStrapChar.writeValue(data);
      },
      observeCommandFromStrapCharacteristic: () => {
        return cmdFromStrapSubject.asObservable();
      },
      observeEventsFromStrapCharacteristic: () => {
        return eventsFromStrapSubject.asObservable();
      },
      observeDataFromStrapCharacteristic: () => {
        return dataFromStrapSubject.asObservable();
      },
      disconnect: async () => {
        await server.disconnect();
        handleDisconnection();
        device.removeEventListener(
          'gattserverdisconnected',
          handleDisconnection,
        );
      },
      isConnected: () => isConnected,
    };
  }
}

export { WebBleTransport };
