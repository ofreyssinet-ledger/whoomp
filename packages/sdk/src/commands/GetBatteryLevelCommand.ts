// src/commands/GetBatteryLevelCommand.ts
import { Command } from '../Command';
import { PacketType, CommandNumber, WhoopPacket } from '../WhoopPacket';

export type GetBatteryLevelResponse = number;

export class GetBatteryLevelCommand
  implements Command<GetBatteryLevelResponse>
{
  readonly id = 'GetBatteryLevelCommand';
  readonly withResponse = true;

  makePacket(): WhoopPacket {
    return new WhoopPacket(
      PacketType.COMMAND,
      0,
      CommandNumber.GET_BATTERY_LEVEL,
      new Uint8Array([0x00]),
    );
  }

  parseResponse(packet: WhoopPacket): GetBatteryLevelResponse {
    const dataView = packet.getDataView();
    let rawBatteryLevel = dataView.getUint16(2, true);
    let batteryLevel = rawBatteryLevel / 10.0;
    return batteryLevel;
  }
}
