import { BehaviorSubject, map, Observable } from 'rxjs';
import { Command } from './Command';
import { ConnectedDevice, DeviceSession } from './DeviceSession';
import { DiscoveredDevice, type Transport } from './Transport';

export class Sdk {
  transport: Transport;

  private deviceSessions: BehaviorSubject<Record<string, DeviceSession>> =
    new BehaviorSubject({});

  constructor(transport: Transport) {
    console.log('SDK: Initialized with transport', transport);
    this.transport = transport;
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
      session.release();
    });
    this.deviceSessions.complete();
    console.log('SDK: All sessions released and deviceSessions completed');
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
      sessionToRemove?.release();
      this.deviceSessions.next(remainingSessions);
    };

    const connectedDevice = await this.transport.connectToDevice(
      id,
      onDisconnectWrapper,
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
