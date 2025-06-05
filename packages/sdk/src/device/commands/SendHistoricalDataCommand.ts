import { Command } from '../Command';
import { PacketType, CommandNumber, WhoopPacket } from '../WhoopPacket';

export class SendHistoricalDataCommand implements Command<void> {
  readonly id = 'SendHistoricalDataCommand';
  readonly withResponse = false;

  makePacket(): WhoopPacket {
    return new WhoopPacket(
      PacketType.COMMAND,
      0,
      CommandNumber.SEND_HISTORICAL_DATA,
      new Uint8Array([0x00]),
    );
  }

  parseResponse(): void {}
}
