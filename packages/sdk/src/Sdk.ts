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

  getDevices(): Observable<DiscoveredDevice[]> {
    console.log('SDK: getDevices called');
    return this.transport.getDevices();
  }

  async connectToDevice(id: string, onDisconnect: () => void): Promise<string> {
    console.log('SDK: connectToDevice called with id', id);
    const onDisconnectWrapper = () => {
      onDisconnect();
      const { [id]: sessionToRemove, ...remainingSessions } =
        this.deviceSessions.getValue();
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

  private getDeviceSession(deviceId: string): DeviceSession | undefined {
    return this.deviceSessions.getValue()[deviceId];
  }

  async sendCommand<T>(deviceId: string, command: Command<T, any>): Promise<T> {
    const deviceSession = this.getDeviceSession(deviceId);
    if (!deviceSession) {
      console.error(`SDK: No device session found for deviceId ${deviceId}`);
      throw new Error(`No device session found for deviceId ${deviceId}`);
    }
    return deviceSession.sendCommand(command);
  }

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
