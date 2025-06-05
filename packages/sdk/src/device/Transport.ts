import { Observable } from 'rxjs';

export type DiscoveredDevice = {
  id: string;
  name: string;
};

export type TransportConnectedDevice = {
  id: string;
  name: string;
  writeCommandToStrapCharacteristic(data: Uint8Array): Promise<void>;
  commandFromStrapCharacteristicObservable: Observable<Uint8Array>;
  eventsFromStrapCharacteristicObservable: Observable<Uint8Array>;
  dataFromStrapCharacteristicObservable: Observable<Uint8Array>;
  disconnect(): Promise<void>;
  isConnected: () => boolean;
};

export interface Transport {
  helloWorld(): string;
  getDevices(): Observable<DiscoveredDevice[]>;
  connectToDevice(
    id: string,
    onDisconnect: () => void,
  ): Promise<TransportConnectedDevice>;
  destroy(): void;
}
