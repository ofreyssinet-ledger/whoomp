import {
  BehaviorSubject,
  filter,
  first,
  firstValueFrom,
  map,
  Subscription,
  Observable,
} from 'rxjs';
import { Command } from './Command';
import { TransportConnectedDevice } from './Transport';
import { PacketType, WhoopPacket } from './WhoopPacket';
import { ConnectedDevice } from './Transport';
import { ToggleRealtimeHRCommand } from './commands/ToggleRealtimeHRCommand';

type HeartRateEvent = {
  date: Date;
  bpm: number | null; // Heart rate in beats per minute, can be null if realtime HR is disabled
};

type LogEvent = {
  date: Date;
  message: string;
};

export class DeviceSession {
  /**
   * Packets from the stap characteristic
   */
  private eventPacketsFromStrap: Observable<WhoopPacket>;
  private dataPacketsFromStrap: Observable<WhoopPacket>;
  private commandPacketsFromStrap: Observable<WhoopPacket>;

  /**
   * Realtime data from strap
   */

  logsFromStrap: BehaviorSubject<Array<LogEvent>>;
  heartRateFromStrap: BehaviorSubject<Array<HeartRateEvent>>;

  private dataStreamSubscription: Subscription;

  constructor(private readonly connectedDevice: TransportConnectedDevice) {
    console.log(
      'SDK: DeviceSession created for device',
      connectedDevice.id,
      connectedDevice.name,
    );
    this.eventPacketsFromStrap =
      connectedDevice.eventsFromStrapCharacteristicObservable.pipe(
        map((data) => WhoopPacket.fromData(data)),
      );
    this.dataPacketsFromStrap =
      connectedDevice.dataFromStrapCharacteristicObservable.pipe(
        map((data) => WhoopPacket.fromData(data)),
      );
    this.commandPacketsFromStrap =
      connectedDevice.commandFromStrapCharacteristicObservable.pipe(
        map((data) => WhoopPacket.fromData(data)),
      );

    this.heartRateFromStrap = new BehaviorSubject<Array<HeartRateEvent>>([]);
    this.logsFromStrap = new BehaviorSubject<Array<LogEvent>>([]);

    this.dataStreamSubscription = this.dataPacketsFromStrap.subscribe(
      (packet) => {
        if (packet.type === PacketType.REALTIME_DATA) {
          const heartRateEvent: HeartRateEvent = {
            date: new Date(),
            bpm: packet.data[5],
          };
          console.log(
            'SDK: Heart rate event received from strap',
            heartRateEvent,
          );
          this.heartRateFromStrap.next([
            ...this.heartRateFromStrap.getValue(),
            heartRateEvent,
          ]);
        } else if (packet.type === PacketType.CONSOLE_LOGS) {
          const logMessage = this.parseLogData(packet.data);
          const logEvent: LogEvent = {
            date: new Date(),
            message: logMessage,
          };
          console.log('SDK: Log event received from strap', logEvent);
          this.logsFromStrap.next([...this.logsFromStrap.getValue(), logEvent]);
        }
      },
    );
  }

  /**
   * Releases the resources used by this DeviceSession.
   * This should be called when the session is no longer needed.
   */
  release() {
    console.log(
      'SDK: Releasing DeviceSession for device',
      this.connectedDevice.id,
    );
    this.dataStreamSubscription.unsubscribe();
  }

  parseLogData(data: Uint8Array): string {
    // Slice from index 7 to the second last element
    const slicedData = data.slice(7, data.length - 1);

    // Remove the invalid byte sequence `[0x34, 0x00, 0x01]` safely
    const cleanedData = [];
    for (let i = 0; i < slicedData.length; i++) {
      // Ensure we don't go out of bounds
      if (
        slicedData[i] === 0x34 &&
        slicedData[i + 1] === 0x00 &&
        slicedData[i + 2] === 0x01 &&
        i + 2 < slicedData.length
      ) {
        i += 2; // Skip the next two bytes safely
        console.log('removed bad');
      } else {
        cleanedData.push(slicedData[i]);
      }
    }

    // Convert the cleaned data back into a Uint8Array
    const cleanedUint8Array = new Uint8Array(cleanedData);

    // Decode the cleaned data to a string
    const decoder = new TextDecoder('utf-8');
    const decodedString = decoder.decode(cleanedUint8Array);

    return decodedString;
  }

  getConnectedDevice(): ConnectedDevice {
    return {
      id: this.connectedDevice.id,
      name: this.connectedDevice.name,
      isConnected: this.connectedDevice.isConnected,
      /**
       * TODO:
       * Here we could add all the public methods to interact with the device.
       * That way, the SDK doesn't have to expose each method individually.
       */
    };
  }

  /**
   *
   * @param command
   * @returns
   */
  async sendCommand<T>(command: Command<T>) {
    if (!this.connectedDevice.isConnected()) {
      throw new Error('Device is not connected');
    }
    console.log('SDK: sendCommand called with command', command);
    const packet = command.makePacket();
    console.log('SDK: sendCommand - packet created', packet.toString());
    await this.connectedDevice.writeCommandToStrapCharacteristic(
      packet.framedPacket(),
    );
    if (!command.withResponse) {
      console.log('SDK: sendCommand - command sent without response');
      return command.parseResponse(packet);
    }
    const responsePacket = await firstValueFrom(
      this.commandPacketsFromStrap.pipe(
        first((responsePacket) => responsePacket.cmd === packet.cmd),
      ),
    );
    console.log(
      'SDK: sendCommand - response received',
      responsePacket.toString(),
    );
    const result = command.parseResponse(responsePacket);
    console.log('SDK: sendCommand - result parsed', result);
    return result;
  }

  private realtimeHREnabled = false;
  async toggleRealTimeHR() {
    const newValue = !this.realtimeHREnabled;
    const command = new ToggleRealtimeHRCommand(newValue);
    await this.sendCommand(command);
    this.realtimeHREnabled = newValue;
    if (!newValue) {
      // If we are disabling realtime HR, clear the heart rate data
      this.heartRateFromStrap.next([
        ...this.heartRateFromStrap.getValue(),
        {
          date: new Date(),
          bpm: null, // Indicate that realtime HR is disabled
        },
      ]);
    }
  }

  async disconnect() {
    console.log('SDK: disconnect called for device', this.connectedDevice.id);
    await this.connectedDevice.disconnect();
    console.log('SDK: Device disconnected', this.connectedDevice.id);
  }
}
