import { Command } from '../Command';
import { PacketType, CommandNumber, WhoopPacket } from '../WhoopPacket';

export class SendHistoricalDataNextBatchCommand implements Command<void> {
  readonly id = 'SendHistoricalDataNextBatchCommand';
  readonly withResponse = false;

  trim: number;

  constructor(trim: number) {
    this.trim = trim;
  }

  makePacket(): WhoopPacket {
    const responsePacket = new Uint8Array(9); // 1 (Byte) + 4 + 4 = 9 bytes
    const responseView = new DataView(responsePacket.buffer);
    responseView.setUint8(0, 1); // Byte set to 1
    responseView.setUint32(1, this.trim, true); // Trim Value (4 bytes)
    responseView.setUint32(5, 0, true); // Zero Padding (4 bytes)
    return new WhoopPacket(
      PacketType.COMMAND,
      0,
      CommandNumber.HISTORICAL_DATA_RESULT,
      responsePacket,
    );
  }

  parseResponse(): void {}
}
