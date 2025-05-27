import { first, firstValueFrom, map, Observable } from 'rxjs';
import { ConnectedDevice, DiscoveredDevice, type Transport } from './Transport';
import { Command } from './Command';
import { WhoopPacket } from './WhoopPacket';

export class Sdk {
  transport: Transport;

  constructor(transport: Transport) {
    console.log('SDK: Initialized with transport', transport);
    this.transport = transport;
  }

  helloWorld() {
    console.log('SDK: helloWorld called');
    return this.transport.helloWorld();
  }

  getDevices(): Observable<DiscoveredDevice[]> {
    console.log('SDK: getDevices called');
    return this.transport.getDevices();
  }

  connectToDevice(
    id: string,
    onDisconnect: () => void,
  ): Promise<ConnectedDevice> {
    console.log('SDK: connectToDevice called with id', id);
    return this.transport.connectToDevice(id, onDisconnect);
  }

  async sendCommand<T>(
    device: ConnectedDevice,
    command: Command<T, any>,
  ): Promise<T> {
    if (!device.isConnected()) {
      throw new Error('Device is not connected');
    }
    console.log('SDK: sendCommand called with command', command);
    const packet = command.makePacket();
    console.log('SDK: sendCommand - packet created', packet.toString());
    await device.writeCommandToStrapCharacteristic(packet.framedPacket());
    const responsePacket = await firstValueFrom(
      device.observeCommandFromStrapCharacteristic().pipe(
        map((data) => WhoopPacket.fromData(data)),
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
}
