import { Command } from '../Command';
import { PacketType, CommandNumber, WhoopPacket } from '../WhoopPacket';

export class SendHistoricalDataNextBatchCommand implements Command<void> {
  readonly id = 'SendHistoricalDataNextBatchCommand';
  readonly withResponse = false;

  params: Uint8Array;

  constructor(data: Uint8Array) {
    this.params = data;
  }

  makePacket(): WhoopPacket {
    return new WhoopPacket(
      PacketType.COMMAND,
      0,
      CommandNumber.HISTORICAL_DATA_RESULT,
      this.params,
    );
  }

  parseResponse(): void {}
}
