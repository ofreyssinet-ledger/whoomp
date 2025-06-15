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
import { parseHistoricalDataPacket } from './parsing/parseHistoricalDataPacket';
import { parseLogData } from './parsing/parseLogData';
import { HistoricalDataPacket } from '../data/model';

type HeartRateEvent = {
  date: Date;
  bpm: number | null; // Heart rate in beats per minute, can be null if realtime HR is disabled
};

type LogEvent = {
  date: Date;
  message: string;
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
  mostRecentHistoricalDataPacket: Observable<HistoricalDataPacket | null>;
  abortDownload: () => void;
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
    this.toggleRealTimeHR(true);
  }

  /**
   * Releases the resources used by this DeviceSession, and disconnects the device.
   * This should be called when the session is no longer needed.
   */
  destroy() {
    console.log(
      '[DeviceSession][destroy] Destroying DeviceSession for device',
      this.connectedDevice.id,
    );
    this.connectedDevice.disconnect();
    this.dataStreamSubscription.unsubscribe();
    if (this.monitoringTimeout) {
      clearTimeout(this.monitoringTimeout);
      this.monitoringTimeout = null;
    }
  }

  pause() {
    console.log(
      '[DeviceSession][pause] Pausing DeviceSession for device',
      this.connectedDevice.id,
    );
    // stop monitoring the device state
    if (this.monitoringTimeout) {
      clearTimeout(this.monitoringTimeout);
      this.monitoringTimeout = null;
    }
  }

  resume() {
    console.log(
      '[DeviceSession][resume] Resuming DeviceSession for device',
      this.connectedDevice.id,
    );
    this.monitorDeviceState();
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
  private async toggleRealTimeHR(newVal?: boolean): Promise<boolean> {
    const newValue = newVal ?? !this.realtimeHREnabled;
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

  private downloadAborted = false;

  /**
   * Requests historical data from the strap.
   * This method will send the command to start downloading historical data
   * and will continue to request batches until the history is complete.
   */
  private async requestHistoricalData(): Promise<void> {
    console.log(
      '[DeviceSession][requestHistoricalData] requestHistoricalData called for device',
      this.connectedDevice.id,
    );
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

      if (this.downloadAborted) {
        console.log(
          '[DeviceSession][getHistoricalDataPackets] Download aborted by user',
        );
        this.downloadAborted = false;
        break;
      }

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
  }

  private mostRecentHistoricalDataPacket =
    new BehaviorSubject<HistoricalDataPacket | null>(null);

  getHistoricalDataPacketsStream(): Observable<HistoricalDataPacket> {
    if (this.deviceSessionState.getValue().downloadingHistoricalData) {
      throw new Error(
        '[DeviceSession][getHistoricalDataPackets] Already downloading historical data',
      );
    }
    return new Observable<HistoricalDataPacket>((subscriber) => {
      this.mostRecentHistoricalDataPacket.next(null);
      this.deviceSessionState.next({
        ...this.deviceSessionState.getValue(),
        downloadingHistoricalData: true,
      });

      const historicalPacketsSub = this.dataPacketsFromStrap
        .pipe(filter((packet) => packet.type === PacketType.HISTORICAL_DATA))
        .subscribe((packet) => {
          // console.log(
          //   '[DeviceSession][getHistoricalDataPackets] Historical data packet received',
          //   packet,
          // );
          try {
            const parsedPacket = parseHistoricalDataPacket(packet);
            const { timestampMs, heartRate, unknown, rr } = parsedPacket;
            subscriber.next(parsedPacket);
            this.mostRecentHistoricalDataPacket.next(parsedPacket);
            // console.log(
            //   `[DeviceSession][getHistoricalDataPackets] Parsed data packet: timestamp=${timestampMs}, date=${new Date(timestampMs).toISOString()}, heartRate=${heartRate}, unknown=${unknown}, rr=${JSON.stringify(rr)}`,
            // );
          } catch (error) {
            console.error(error);
          }
        });
      this.taskQueue
        .addTask(() => this.requestHistoricalData())
        .then(() => {
          console.log(
            '[DeviceSession][getHistoricalDataPackets] Historical data download completed',
          );
          subscriber.complete();
        })
        .catch((error) => {
          console.error(
            '[DeviceSession][getHistoricalDataPackets] Error downloading historical data:',
            error,
          );
          subscriber.error(error);
        })
        .finally(() => {
          this.deviceSessionState.next({
            ...this.deviceSessionState.getValue(),
            downloadingHistoricalData: false,
          });
          historicalPacketsSub.unsubscribe();
        });
      return () => {
        console.log(
          '[DeviceSession][getHistoricalDataPackets] Cleanup function called, unsubscribing from historical packets',
        );
        this.deviceSessionState.next({
          ...this.deviceSessionState.getValue(),
          downloadingHistoricalData: false,
        });
        historicalPacketsSub.unsubscribe();
      };
    });
  }

  private abortDownload(): void {
    console.log(
      '[DeviceSession][abortDownload] abortDownload called for device',
      this.connectedDevice.id,
    );
    this.downloadAborted = true;
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
      mostRecentHistoricalDataPacket:
        this.mostRecentHistoricalDataPacket.asObservable(),
      abortDownload: () => this.abortDownload(),
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
