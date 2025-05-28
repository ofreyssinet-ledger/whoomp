// src/commands/GetClockCommand.ts
import { Command } from '../Command';
import { PacketType, CommandNumber, WhoopPacket } from '../WhoopPacket';

export type GetClockResponse = number;

export class GetClockCommand implements Command<GetClockResponse, void> {
  id = 'GetClockCommand';
  params = undefined;

  makePacket(): WhoopPacket {
    return new WhoopPacket(
      PacketType.COMMAND,
      0,
      CommandNumber.GET_CLOCK,
      new Uint8Array([0x00]),
    );
  }

  parseResponse(packet: WhoopPacket): GetClockResponse {
    const dataView = packet.getDataView();
    let unix = dataView.getUint32(2, true);
    return unix;
  }
}
