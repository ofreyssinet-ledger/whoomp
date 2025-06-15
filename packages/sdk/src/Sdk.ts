import { BehaviorSubject, map, merge, Observable } from 'rxjs';
import { Command } from './device/Command';
import { ConnectedDevice, DeviceSession } from './device/DeviceSession';
import { DiscoveredDevice, type Transport } from './device/Transport';
import { HistoricalDataDump } from './data/model';
import { mergeHistoricalDataDumps } from './data/utils';
import { downloadHistoricalData } from './device/download/downloadHistoricalData';
import { Storage } from './data/Storage';
import { analyseData } from './analysis/analyseData';

export class Sdk {
  transport: Transport;
  storage: Storage;

  private deviceSessions: BehaviorSubject<Record<string, DeviceSession>> =
    new BehaviorSubject({});

  constructor(transport: Transport, storage: Storage) {
    console.log('SDK: Initialized with transport', transport);
    this.transport = transport;
    this.storage = storage;
  }

  destroy() {
    // TODO: do this properly
    console.log('SDK: destroy called');
    this.transport.destroy();
    Object.values(this.deviceSessions.getValue()).forEach((session) => {
      console.log(
        'SDK: Releasing session for device',
        session.getConnectedDevice().id,
      );
      session.destroy();
    });
    this.deviceSessions.complete();
    console.log('SDK: All sessions released and deviceSessions completed');
  }

  pause() {
    console.log('SDK: pause called');
    Object.values(this.deviceSessions.getValue()).forEach((session) => {
      session.pause();
    });
  }

  resume() {
    console.log('SDK: resume called');
    Object.values(this.deviceSessions.getValue()).forEach((session) => {
      session.resume();
    });
  }

  helloWorld() {
    console.log('SDK: helloWorld called');
    return this.transport.helloWorld();
  }

  /**
   * Retrieves a list of discovered devices.
   * @returns An observable that emits an array of discovered devices.
   */
  getDevices(): Observable<DiscoveredDevice[]> {
    console.log('SDK: getDevices called');
    return this.transport.getDevices();
  }

  /**
   * Connects to a device by its ID and sets up a session for it.
   * @param id The ID of the device to connect to.
   * @param onDisconnect Callback function to be called when the device disconnects.
   * @returns The ID of the connected device.
   */
  async connectToDevice(
    id: string,
    onDisconnect: () => void,
  ): Promise<ConnectedDevice> {
    console.log('[SDK][connectToDevice] connectToDevice called with id', id);

    const existingSession = this.getDeviceSession(id);
    if (existingSession) {
      console.log(
        '[SDK][connectToDevice] Device session already exists for id',
        id,
      );
      return existingSession.getConnectedDevice(); // Return early if the session already exists
    }

    const onDisconnectWrapper = () => {
      console.log(
        '[SDK][connectToDevice] Device disconnected, cleaning up session for id',
        id,
      );
      onDisconnect();
      const { [id]: sessionToRemove, ...remainingSessions } =
        this.deviceSessions.getValue();
      console.log('Session to remove:', sessionToRemove);
      sessionToRemove?.destroy();
      this.deviceSessions.next(remainingSessions);
    };

    const connectedDevice = await this.transport.connectToDevice(
      id,
      onDisconnectWrapper,
    );

    this.storage.saveKnownDevice(
      connectedDevice.id,
      connectedDevice.name,
      Date.now(),
    );

    console.log(
      '[SDK][connectToDevice] Device connected, creating session for id',
      id,
    );
    try {
      const deviceSession = new DeviceSession(connectedDevice);
      this.deviceSessions.next({
        ...this.deviceSessions.getValue(),
        [id]: deviceSession,
      });
      console.log(
        '[SDK][connectToDevice] Device connected and session created for id',
        id,
      );
      return deviceSession.getConnectedDevice();
    } catch (error) {
      console.error(
        '[SDK][connectToDevice] Error creating device session for id',
        id,
        error,
      );
      // Clean up the connected device if session creation fails
      await connectedDevice.disconnect();
      throw new Error(`Failed to create device session for id ${id}: ${error}`);
    }
  }

  /**
   * Observes connected devices and emits updates when the list changes.
   * @returns An observable that emits an object mapping device IDs to ConnectedDevice instances.
   */
  observeConnectedDevices(): Observable<{ [id: string]: ConnectedDevice }> {
    console.log('SDK: observeConnectedDevices called');
    return this.deviceSessions.asObservable().pipe(
      map((sessions) => {
        const connectedDevices: Record<string, ConnectedDevice> = {};
        for (const [id, session] of Object.entries(sessions)) {
          connectedDevices[id] = session.getConnectedDevice();
        }
        return connectedDevices;
      }),
    );
  }

  private getDeviceSession(deviceId: string): DeviceSession | undefined {
    return this.deviceSessions.getValue()[deviceId];
  }

  /**
   * Sends a command to a connected device and returns the result.
   * @param deviceId The ID of the device to send the command to.
   * @param command The command to send.
   * @returns A promise that resolves with the result of the command.
   */
  async sendCommand<T>(deviceId: string, command: Command<T>): Promise<T> {
    const deviceSession = this.getDeviceSession(deviceId);
    if (!deviceSession) {
      console.error(`SDK: No device session found for deviceId ${deviceId}`);
      throw new Error(`No device session found for deviceId ${deviceId}`);
    }
    return deviceSession.sendCommand(command);
  }

  /**
   * Downloads historical data for a connected device. Saves the data in chunks
   * to the storage using the provided buffer size.
   * @param deviceId The ID of the device to download data from.
   * @param bufferSize The size of the buffer for historical data packets (default is 36000).
   * @returns A promise that resolves with the historical data dump.
   */
  async downloadHistoricalData(
    deviceId: string,
    bufferSize = 36000,
  ): Promise<Array<HistoricalDataDump>> {
    console.log('SDK: downloadHistoricalData called for deviceId', deviceId);
    const deviceSession = this.getDeviceSession(deviceId);
    if (!deviceSession) {
      console.error(`SDK: No device session found for deviceId ${deviceId}`);
      throw new Error(`No device session found for deviceId ${deviceId}`);
    }
    console.log('SDK: Downloading historical data for deviceId', deviceId);
    const deviceName = deviceSession.getConnectedDevice().name;

    return downloadHistoricalData(
      deviceId,
      deviceName,
      deviceSession.getHistoricalDataPacketsStream(),
      (dataDump: HistoricalDataDump) => {
        return this.storage.saveHistoricalDataPackets(
          deviceName,
          dataDump.dataDump,
        );
      },
      bufferSize,
    );
  }

  async getMergedHistoricalDataDump(
    deviceId: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<HistoricalDataDump> {
    const deviceSession = this.getDeviceSession(deviceId);
    if (!deviceSession) {
      console.error(`SDK: No device session found for deviceId ${deviceId}`);
      throw new Error(`No device session found for deviceId ${deviceId}`);
    }
    const deviceName = deviceSession.getConnectedDevice().name;
    const dumps = await this.storage.getHistoricalDataDumps(
      deviceName,
      fromDate,
      toDate,
    );

    return mergeHistoricalDataDumps(dumps);
  }

  async syncDeviceData(deviceId: string, fromDate?: Date) {
    console.log('SDK: [syncDeviceData] called for deviceId', deviceId);
    let downloadedData: Array<HistoricalDataDump> = [];
    try {
      downloadedData = await this.downloadHistoricalData(deviceId);
    } catch (error) {
      console.error(
        'SDK: [syncDeviceData] Error downloading historical data for deviceId',
        deviceId,
        error,
      );
      return;
    }
    console.log(
      'SDK: [syncDeviceData] Download completed for deviceId',
      deviceId,
      'with',
      downloadedData.length,
    );
    const deviceSession = this.getDeviceSession(deviceId);
    if (!deviceSession) {
      console.error(`SDK: No device session found for deviceId ${deviceId}`);
      throw new Error(`No device session found for deviceId ${deviceId}`);
    }
    const deviceName = deviceSession.getConnectedDevice().name;

    let effectiveFromDate: Date | undefined = fromDate;
    if (!effectiveFromDate) {
      console.log(
        'SDK: [syncDeviceData] No effectiveFromDate provided, checking storage for last synced date',
      );
      const status = await this.storage.getDeviceSyncStatus(deviceName);
      console.log(
        'SDK: [syncDeviceData] Device sync status retrieved:',
        status,
      );
      if (status && status.lastSyncedMs) {
        const ms25H = 25 * 60 * 60 * 1000; // 25 hours in milliseconds
        // Analyse data from 25h before the last synced date to get the 24h RHR
        effectiveFromDate = new Date(status.lastSyncedMs - ms25H);
      } else {
        // just sync from the beginning
      }
    }

    console.log(
      'SDK: [syncDeviceData] Effective from date for analysis is',
      effectiveFromDate?.toUTCString(),
    );
    await this.analyseDeviceData(
      deviceName,
      effectiveFromDate,
      undefined,
      true,
    );
    console.log(
      'SDK: [syncDeviceData] Data synced and analysed for device',
      deviceName,
    );
  }

  async analyseDeviceData(
    deviceName: string,
    fromDate?: Date,
    toDate?: Date,
    eraseExistingAnalysis: boolean = true,
  ) {
    console.log(
      'SDK: [analyseDeviceData] called for deviceName',
      deviceName,
      'fromDate',
      fromDate?.toUTCString(),
      'toDate',
      toDate?.toUTCString(),
    );
    // First, fetch the historical data dumps for the device
    const dump = await this.storage.getHistoricalDataDumpNew(
      deviceName,
      fromDate,
      toDate,
    );
    console.log(
      'SDK: [analyseDeviceData] Historical data dump retrieved for deviceName',
      deviceName,
      'with',
      dump.length,
      'data points',
    );

    // Now, analyze the merged data
    const analysedData = analyseData(dump);

    console.log(
      'SDK: [analyseDeviceData] Data analysis completed for deviceName',
      deviceName,
    );

    // If eraseExisting is true, erase the existing data in storage
    if (eraseExistingAnalysis) {
      this.storage.deleteHeartRateAverage1min(deviceName, fromDate, toDate);
      this.storage.deleteHeartRateAverage2min(deviceName, fromDate, toDate);
      this.storage.deleteHeartRateAverage5min(deviceName, fromDate, toDate);
    }

    // Save the new analysis results to storage
    this.storage.saveHeartRateAverage1min(
      analysedData.hrAvg1min.map((data) => ({
        ...data,
        date: new Date(data.timestampMs),
        deviceName,
      })),
    );
    this.storage.saveHeartRateAverage2min(
      analysedData.hrAvg2min.map((data) => ({
        ...data,
        date: new Date(data.timestampMs),
        deviceName,
      })),
    );
    this.storage.saveHeartRateAverage5min(
      analysedData.hrAvg5min.map((data) => ({
        ...data,
        date: new Date(data.timestampMs),
        deviceName,
      })),
    );
    this.storage.saveRestingHeartRate24h(
      analysedData.rhr24h.map((data) => ({
        ...data,
        date: new Date(data.timestampMs),
        deviceName,
      })),
    );
    this.storage.saveSyncStatus(deviceName, dump[dump.length - 1].timestampMs);
    return analysedData;
  }

  abortAllDownloads(): void {
    console.log('SDK: abortAllDownloads called');
    const sessions = this.deviceSessions.getValue();
    for (const session of Object.values(sessions)) {
      console.log(
        'SDK: Aborting download for device',
        session.getConnectedDevice().id,
      );
      session.getConnectedDevice().abortDownload();
    }
    console.log('SDK: All downloads aborted');
  }

  /**
   * Disconnects from a device by its ID.
   * @param deviceId The ID of the device to disconnect from.
   * @returns A promise that resolves when the disconnection is complete.
   */
  async disconnectFromDevice(deviceId: string): Promise<void> {
    console.log('SDK: disconnectFromDevice called with id', deviceId);
    const deviceSession = this.getDeviceSession(deviceId);
    if (!deviceSession) {
      console.error(`SDK: No device session found for deviceId ${deviceId}`);
      throw new Error(`No device session found for deviceId ${deviceId}`);
    }
    await deviceSession.disconnect();
  }
}
