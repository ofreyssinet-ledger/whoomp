import {
  BehaviorSubject,
  filter,
  first,
  firstValueFrom,
  map,
  Observable,
  Subscription,
} from 'rxjs';
import { Command } from './Command';
import { DeviceState, initialDeviceState } from './DeviceState';
import { TaskQueue } from '../utils/TasksQueue';
import { TransportConnectedDevice } from './Transport';
import { MetadataType, PacketType, WhoopPacket } from './WhoopPacket';
import { GetBatteryLevelCommand } from './commands/GetBatteryLevelCommand';
import { GetClockCommand } from './commands/GetClockCommand';
import { GetHelloHarvardCommand } from './commands/GetHelloHarvardCommand';
import { RebootStrapCommand } from './commands/RebootStrapCommand';
import { ReportVersionInfoCommand } from './commands/ReportVersionInfoCommand';
import { SendHistoricalDataCommand } from './commands/SendHistoricalDataCommand';
import { SendHistoricalDataNextBatchCommand } from './commands/SendHistoricalDataNextBatchCommand';
import { ToggleRealtimeHRCommand } from './commands/ToggleRealtimeHRCommand';
import {
  ParsedHistoricalDataPacket,
  parseHistoricalDataPacket,
} from './parsing/parseHistoricalDataPacket';
import { parseLogData } from './parsing/parseLogData';

type HeartRateEvent = {
  date: Date;
  bpm: number | null; // Heart rate in beats per minute, can be null if realtime HR is disabled
};

type LogEvent = {
  date: Date;
  message: string;
};

type GetHistoricalDataPacketsResult = {
  packets: Array<WhoopPacket>;
  parsedData: Array<ParsedHistoricalDataPacket>;
};

export type DeviceSessionState = {
  downloadingHistoricalData: boolean;
  logsFromStrapEnabled: boolean;
};

export type ConnectedDevice = {
  id: string;
  name: string;
  isConnected: () => boolean;
  deviceStateObservable: Observable<DeviceState>;
  heartRateFromStrapObservable: Observable<Array<HeartRateEvent>>;
  logsFromStrapObservable: Observable<Array<LogEvent>>;
  isLogsFromStrapEnabled: () => boolean;
  setLogsFromStrapEnabled: (enabled: boolean) => void;
  toggleRealTimeHR: () => Promise<boolean>;
  getHistoricalDataPackets: () => Promise<GetHistoricalDataPacketsResult>;
  mostRecentHistoricalDataPacket: Observable<ParsedHistoricalDataPacket | null>;
  deviceSessionState: Observable<DeviceSessionState>;
  sendCommand: <T>(command: Command<T>) => Promise<T>;
  rebootStrap: () => Promise<void>;
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

  private deviceSessionState: BehaviorSubject<DeviceSessionState> =
    new BehaviorSubject<DeviceSessionState>({
      downloadingHistoricalData: false,
      logsFromStrapEnabled: false,
    });

  constructor(private readonly connectedDevice: TransportConnectedDevice) {
    this.eventPacketsFromStrap =
      connectedDevice.eventsFromStrapCharacteristicObservable.pipe(
        map((data) => WhoopPacket.fromData(data)),
      );
    this.dataPacketsFromStrap =
      connectedDevice.dataFromStrapCharacteristicObservable.pipe(
        filter(
          (data) =>
            this.isLogsFromStrapEnabled() || !WhoopPacket.isConsoleLogs(data), // Optim because there are LOTS of console logs when getting historical data
        ),
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
        } else if (
          packet.type === PacketType.CONSOLE_LOGS &&
          this.isLogsFromStrapEnabled()
        ) {
          const logMessage = parseLogData(packet.data);
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
        await this.taskQueue.addTask(() => Promise.resolve());
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

  private mostRecentHistoricalDataPacket =
    new BehaviorSubject<ParsedHistoricalDataPacket | null>(null);

  private async getHistoricalDataPacketsInternal(): Promise<GetHistoricalDataPacketsResult> {
    let packets: Array<WhoopPacket> = [];
    let parsedData: Array<ParsedHistoricalDataPacket> = [];

    this.mostRecentHistoricalDataPacket.next(null);
    this.deviceSessionState.next({
      ...this.deviceSessionState.getValue(),
      downloadingHistoricalData: true,
    });

    const historicalPacketsSub = this.dataPacketsFromStrap
      .pipe(filter((packet) => packet.type === PacketType.HISTORICAL_DATA))
      .subscribe((packet) => {
        console.log(
          '[DeviceSession][getHistoricalDataPackets] Historical data packet received',
          packet,
        );
        try {
          const parsedPacket = parseHistoricalDataPacket(packet);
          const { datePrecise, heartRate, unknown, rr } = parsedPacket;
          this.mostRecentHistoricalDataPacket.next(parsedPacket);
          parsedData.push(parsedPacket);
          console.log(
            `[DeviceSession][getHistoricalDataPackets] Parsed data packet: DatePrecise=${datePrecise.toISOString()}, heartRate=${heartRate}, unknown=${unknown}, rr=${JSON.stringify(rr)}`,
          );
        } catch (error) {
          console.error(error);
        }
        packets.push(packet);
      });
    try {
      const metaPackets = this.dataPacketsFromStrap.pipe(
        filter((packet) => packet.type === PacketType.METADATA),
      );

      await this.sendCommandInternal(new SendHistoricalDataCommand());

      while (true) {
        const metadataPacket = await firstValueFrom(
          metaPackets.pipe(
            first(
              (packet) =>
                (packet.cmd as number) === MetadataType.HISTORY_END ||
                (packet.cmd as number) === MetadataType.HISTORY_COMPLETE,
            ),
          ),
        );

        if ((metadataPacket.cmd as number) === MetadataType.HISTORY_COMPLETE) {
          console.log(
            '[DeviceSession][getHistoricalDataPackets] History complete packet received',
            metadataPacket,
          );
          break;
        } else {
          console.log(
            '[DeviceSession][getHistoricalDataPackets] History end packet received, but not complete',
            metadataPacket,
          );
        }

        // Get the trim and construct new packet
        const dataView = new DataView(metadataPacket.data.buffer);
        const trim = dataView.getUint32(10, true); // Little-endian

        await this.sendCommandInternal(
          new SendHistoricalDataNextBatchCommand(trim),
        );
      }

      return { packets, parsedData };
    } finally {
      this.deviceSessionState.next({
        ...this.deviceSessionState.getValue(),
        downloadingHistoricalData: false,
      });
      console.log(
        '[DeviceSession][getHistoricalDataPackets] Unsubscribing from historical packets',
      );
      historicalPacketsSub.unsubscribe();
    }
  }

  private async getHistoricalDataPackets() {
    console.log(
      '[DeviceSession][getHistoricalDataPackets] getHistoricalDataPackets called for device',
      this.connectedDevice.id,
    );
    return this.taskQueue.addTask(() =>
      this.getHistoricalDataPacketsInternal(),
    );
  }

  private isLogsFromStrapEnabled(): boolean {
    return this.deviceSessionState.getValue().logsFromStrapEnabled;
  }

  private setLogsFromStrapEnabled(enabled: boolean): void {
    this.deviceSessionState.next({
      ...this.deviceSessionState.getValue(),
      logsFromStrapEnabled: enabled,
    });
  }

  private async rebootStrap(): Promise<void> {
    console.log(
      '[DeviceSession][rebootStrap] rebootStrap called for device',
      this.connectedDevice.id,
    );
    /**
     * Here we use the internal sendCommand method to ensure we can reboot
     * even if the task queue is busy/blocked.
     */
    return this.sendCommandInternal(new RebootStrapCommand());
  }

  getConnectedDevice(): ConnectedDevice {
    return {
      id: this.connectedDevice.id,
      name: this.connectedDevice.name,
      isConnected: this.connectedDevice.isConnected,
      deviceStateObservable: this.deviceStateSubject.asObservable(),
      logsFromStrapObservable: this.logsFromStrap.asObservable(),
      isLogsFromStrapEnabled: () => this.isLogsFromStrapEnabled(),
      setLogsFromStrapEnabled: (enabled: boolean) =>
        this.setLogsFromStrapEnabled(enabled),
      heartRateFromStrapObservable: this.heartRateFromStrap.asObservable(),
      getHistoricalDataPackets: () => this.getHistoricalDataPackets(),
      mostRecentHistoricalDataPacket:
        this.mostRecentHistoricalDataPacket.asObservable(),
      deviceSessionState: this.deviceSessionState.asObservable(),
      rebootStrap: () => this.rebootStrap(),
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
