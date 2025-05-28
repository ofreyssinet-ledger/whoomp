import { first, firstValueFrom, map } from 'rxjs';
import { Command } from './Command';
import { TransportConnectedDevice } from './Transport';
import { WhoopPacket } from './WhoopPacket';
import { ConnectedDevice } from './Transport';

export class DeviceSession {
  constructor(private readonly connectedDevice: TransportConnectedDevice) {
    console.log(
      'SDK: DeviceSession created for device',
      connectedDevice.id,
      connectedDevice.name,
    );
  }

  getConnectedDevice(): ConnectedDevice {
    return {
      id: this.connectedDevice.id,
      name: this.connectedDevice.name,
      isConnected: this.connectedDevice.isConnected,
    };
  }

  async sendCommand<T>(command: Command<T, any>) {
    if (!this.connectedDevice.isConnected()) {
      throw new Error('Device is not connected');
    }
    console.log('SDK: sendCommand called with command', command);
    const packet = command.makePacket();
    console.log('SDK: sendCommand - packet created', packet.toString());
    await this.connectedDevice.writeCommandToStrapCharacteristic(
      packet.framedPacket(),
    );
    const responsePacket = await firstValueFrom(
      this.connectedDevice.commandFromStrapCharacteristicObservable.pipe(
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

  async disconnect() {
    console.log('SDK: disconnect called for device', this.connectedDevice.id);
    await this.connectedDevice.disconnect();
    console.log('SDK: Device disconnected', this.connectedDevice.id);
  }
}
