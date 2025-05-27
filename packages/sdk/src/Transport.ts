import { Observable } from 'rxjs';

export type DiscoveredDevice = {
  id: string;
  name: string;
};

export type ConnectedDevice = {
  id: string;
  name: string;
  writeCommandToStrapCharacteristic(data: Uint8Array): Promise<void>;
  observeCommandFromStrapCharacteristic(): Observable<Uint8Array>;
  observeEventsFromStrapCharacteristic(): Observable<Uint8Array>;
  observeDataFromStrapCharacteristic(): Observable<Uint8Array>;
  disconnect(): Promise<void>;
  isConnected: () => boolean;
};

export interface Transport {
  helloWorld(): string;
  getDevices(): Observable<DiscoveredDevice[]>;
  connectToDevice(
    id: string,
    onDisconnect: () => void,
  ): Promise<ConnectedDevice>;
}
