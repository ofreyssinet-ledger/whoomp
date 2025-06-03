import {
  BehaviorSubject,
  first,
  firstValueFrom,
  map,
  Subscription,
  Observable,
} from 'rxjs';
import { Command } from './Command';
import { TransportConnectedDevice } from './Transport';
import { PacketType, WhoopPacket } from './WhoopPacket';
import { ToggleRealtimeHRCommand } from './commands/ToggleRealtimeHRCommand';
import { DeviceState, initialDeviceState } from './DeviceState';
import { GetBatteryLevelCommand } from './commands/GetBatteryLevelCommand';
import { GetHelloHarvardCommand } from './commands/GetHelloHarvardCommand';
import { GetClockCommand } from './commands/GetClockCommand';
import { ReportVersionInfoCommand } from './commands/ReportVersionInfoCommand';
import { TaskQueue } from './TasksQueue';

type HeartRateEvent = {
  date: Date;
  bpm: number | null; // Heart rate in beats per minute, can be null if realtime HR is disabled
};

type LogEvent = {
  date: Date;
  message: string;
};

export type ConnectedDevice = {
  id: string;
  name: string;
  isConnected: () => boolean;
  deviceStateObservable: Observable<DeviceState>;
  heartRateFromStrapObservable: Observable<Array<HeartRateEvent>>;
  logsFromStrapObservable: Observable<Array<LogEvent>>;
  toggleRealTimeHR: () => Promise<boolean>;
  sendCommand: <T>(command: Command<T>) => Promise<T>;
  disconnect: () => Promise<void>;
};

export class DeviceSession {
  /**
   * Packets from the strap characteristic
   */
  private eventPacketsFromStrap: Observable<WhoopPacket>;
  private dataPacketsFromStrap: Observable<WhoopPacket>;
  private commandPacketsFromStrap: Observable<WhoopPacket>;

  /**
   * Realtime data from strap
   */

  private logsFromStrap: BehaviorSubject<Array<LogEvent>>;
  private heartRateFromStrap: BehaviorSubject<Array<HeartRateEvent>>;

  private dataStreamSubscription: Subscription;

  /**
   * Task queue to ensure commands are sent and their responses are processed in order.
   */
  private taskQueue: TaskQueue = new TaskQueue();

  private deviceStateSubject: BehaviorSubject<DeviceState> =
    new BehaviorSubject(initialDeviceState);

  constructor(private readonly connectedDevice: TransportConnectedDevice) {
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
            '[DeviceSession][dataStreamSubscription] Heart rate event received from strap',
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
          console.log(
            '[DeviceSession][dataStreamSubscription] Log event received from strap',
            logEvent,
          );
          this.logsFromStrap.next([...this.logsFromStrap.getValue(), logEvent]);
        }
      },
    );

    this.monitorDeviceState();
  }

  /**
   * Releases the resources used by this DeviceSession.
   * This should be called when the session is no longer needed.
   */
  release() {
    console.log(
      '[DeviceSession][release] Releasing DeviceSession for device',
      this.connectedDevice.id,
    );
    this.dataStreamSubscription.unsubscribe();
    if (this.monitoringTimeout) {
      clearTimeout(this.monitoringTimeout);
      this.monitoringTimeout = null;
    }
  }

  monitoringInterval: number = 5000; // 5 seconds
  monitoringTimeout: ReturnType<typeof setTimeout> | null = null;
  async monitorDeviceState() {
    console.log(
      '[DeviceSession][monitorDeviceState] called for device',
      this.connectedDevice.id,
    );
    const versionInfo = await this.sendCommand(new ReportVersionInfoCommand());
    this.deviceStateSubject.next({
      ...initialDeviceState,
      versionInfo,
    });
    const poll = async () => {
      try {
        console.log(
          '[DeviceSession][monitorDeviceState] Polling: monitoring device state for',
          this.connectedDevice.id,
        );
        const batteryLevel = await this.sendCommand(
          new GetBatteryLevelCommand(),
        );
        const { isWorn, charging } = await this.sendCommand(
          new GetHelloHarvardCommand(),
        );
        const clock = await this.sendCommand(new GetClockCommand());

        const newState: DeviceState = {
          ...this.deviceStateSubject.getValue(),
          batteryLevel,
          isWorn,
          charging,
          clock,
        };

        this.deviceStateSubject.next(newState);
      } catch (error) {
        console.error('Error monitoring device state:', error);
      } finally {
        this.monitoringTimeout = setTimeout(poll, this.monitoringInterval);
      }
    };
    poll();
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
        // console.log('removed bad');
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

  /**
   * Does the actual work of sending a command to the strap.
   * This method is private and should not be called directly.
   * Use `sendCommand` instead.
   * @param command
   * @returns the parsed response from the command
   */
  private async sendCommandInternal<T>(command: Command<T>) {
    if (!this.connectedDevice.isConnected()) {
      throw new Error('Device is not connected');
    }
    console.log(
      '[DeviceSession][sendCommandInternal] sendCommand called with command',
      command,
    );
    const packet = command.makePacket();
    await this.connectedDevice.writeCommandToStrapCharacteristic(
      packet.framedPacket(),
    );
    if (!command.withResponse) {
      return command.parseResponse(packet);
    }
    const responsePacket = await firstValueFrom(
      this.commandPacketsFromStrap.pipe(
        first((responsePacket) => responsePacket.cmd === packet.cmd),
      ),
    );
    const result = command.parseResponse(responsePacket);
    console.log('[DeviceSession][sendCommandInternal] result parsed', result);
    return result;
  }

  /**
   * Sends a command to the strap and returns the response.
   * @param command The command to send
   * @returns The parsed response from the command
   */
  async sendCommand<T>(command: Command<T>): Promise<T> {
    console.log(
      '[DeviceSession][sendCommand] sendCommand called for device',
      this.connectedDevice.id,
    );
    return this.taskQueue.addTask(() => this.sendCommandInternal(command));
  }

  private realtimeHREnabled = false;
  private async toggleRealTimeHR(): Promise<boolean> {
    const newValue = !this.realtimeHREnabled;
    const command = new ToggleRealtimeHRCommand(newValue);
    await this.sendCommandInternal(command);
    this.realtimeHREnabled = newValue;
    this.deviceStateSubject.next({
      ...this.deviceStateSubject.getValue(),
      realtimeHeartRateEnabled: newValue,
    });
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
    return this.realtimeHREnabled;
  }

  getConnectedDevice(): ConnectedDevice {
    return {
      id: this.connectedDevice.id,
      name: this.connectedDevice.name,
      isConnected: this.connectedDevice.isConnected,
      deviceStateObservable: this.deviceStateSubject.asObservable(),
      logsFromStrapObservable: this.logsFromStrap.asObservable(),
      heartRateFromStrapObservable: this.heartRateFromStrap.asObservable(),
      toggleRealTimeHR: () => this.toggleRealTimeHR(),
      sendCommand: <T>(command: Command<T>) => this.sendCommand(command),
      disconnect: () => this.disconnect(),
    };
  }

  async disconnect() {
    console.log(
      '[DeviceSession][disconnect] disconnect called for device',
      this.connectedDevice.id,
    );
    await this.connectedDevice.disconnect();
    console.log(
      '[DeviceSession][disconnect] Device disconnected',
      this.connectedDevice.id,
    );
  }
}
