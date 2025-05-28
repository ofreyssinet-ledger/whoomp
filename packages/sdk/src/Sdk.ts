import { BehaviorSubject, map, Observable } from 'rxjs';
import {
  TransportConnectedDevice,
  DiscoveredDevice,
  type Transport,
  ConnectedDevice,
} from './Transport';
import { Command } from './Command';
import { DeviceSession } from './DeviceSession';

export class Sdk {
  transport: Transport;

  private deviceSessions: BehaviorSubject<Record<string, DeviceSession>> =
    new BehaviorSubject({});

  constructor(transport: Transport) {
    console.log('SDK: Initialized with transport', transport);
    this.transport = transport;
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
  async connectToDevice(id: string, onDisconnect: () => void): Promise<string> {
    console.log('SDK: connectToDevice called with id', id);

    const existingSession = this.getDeviceSession(id);
    if (existingSession) {
      console.log('SDK: Device session already exists for id', id);
      return id; // Return early if the session already exists
    }

    const onDisconnectWrapper = () => {
      console.log('SDK: Device disconnected, cleaning up session for id', id);
      onDisconnect();
      const { [id]: sessionToRemove, ...remainingSessions } =
        this.deviceSessions.getValue();
      console.log('Session to remove:', sessionToRemove);
      sessionToRemove?.release();
      this.deviceSessions.next(remainingSessions);
    };

    const connectedDevice = await this.transport.connectToDevice(
      id,
      onDisconnectWrapper,
    );
    const deviceSession = new DeviceSession(connectedDevice);
    this.deviceSessions.next({
      ...this.deviceSessions.getValue(),
      [id]: deviceSession,
    });
    console.log('SDK: Device connected and session created for id', id);
    return id;
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

  /**
   * Observes heart rate events from a connected device.
   * @param deviceId The ID of the device to observe heart rate events from.
   * @returns An observable that emits heart rate events.
   */
  async observeHeartRateEvents(deviceId: string) {
    console.log('SDK: observeHeartRateEvents called for deviceId', deviceId);
    const deviceSession = this.getDeviceSession(deviceId);
    if (!deviceSession) {
      console.error(`SDK: No device session found for deviceId ${deviceId}`);
      throw new Error(`No device session found for deviceId ${deviceId}`);
    }
    return deviceSession.heartRateFromStrap;
  }

  /**
   * Toggles real-time heart rate monitoring for a connected device.
   * @param deviceId The ID of the device to toggle real-time heart rate for.
   * @returns A promise that resolves when the toggle operation is complete.
   */
  async toggleRealTimeHR(deviceId: string) {
    console.log('SDK: toggleRealTimeHR called for deviceId', deviceId);
    const deviceSession = this.getDeviceSession(deviceId);
    if (!deviceSession) {
      console.error(`SDK: No device session found for deviceId ${deviceId}`);
      throw new Error(`No device session found for deviceId ${deviceId}`);
    }
    return deviceSession.toggleRealTimeHR();
  }
}
