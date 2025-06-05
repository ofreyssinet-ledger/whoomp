import { Command } from '../Command';
import { PacketType, CommandNumber, WhoopPacket } from '../WhoopPacket';

export type ReportVersionInfoResponse = {
  harvard: string;
  boylston: string;
};

export class ReportVersionInfoCommand
  implements Command<ReportVersionInfoResponse>
{
  readonly id = 'ReportVersionInfoCommand';
  readonly withResponse = true;

  makePacket(): WhoopPacket {
    return new WhoopPacket(
      PacketType.COMMAND,
      0,
      CommandNumber.REPORT_VERSION_INFO,
      new Uint8Array([0x00]),
    );
  }

  parseResponse(packet: WhoopPacket): ReportVersionInfoResponse {
    const dataView = packet.getDataView();
    let offset = 0;
    offset += 3; // skip header bytes

    const values: number[] = [];
    for (let i = 0; i < 16; i++) {
      values.push(dataView.getUint32(offset, true));
      offset += 4;
    }

    const harvard = `${values[0]}.${values[1]}.${values[2]}.${values[3]}`;
    const boylston = `${values[4]}.${values[5]}.${values[6]}.${values[7]}`;
    return { harvard, boylston };
  }
}
