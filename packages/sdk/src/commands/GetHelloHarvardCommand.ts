import { Command } from '../Command';
import { CommandNumber, PacketType, WhoopPacket } from '../WhoopPacket';

type GetHelloHarvardResponse = {
  charging: boolean;
  isWorn: boolean;
};

export class GetHelloHarvardCommand
  implements Command<GetHelloHarvardResponse, void>
{
  id = 'GetHelloHarvardCommand';

  params = undefined;

  makePacket(): WhoopPacket {
    return new WhoopPacket(
      PacketType.COMMAND,
      0,
      CommandNumber.GET_HELLO_HARVARD,
      new Uint8Array([0x00]),
    );
  }

  parseResponse(packet: WhoopPacket): GetHelloHarvardResponse {
    const dataView = packet.getDataView();
    let charging = dataView.getUint8(7) ? true : false;
    let isWorn = dataView.getUint8(116) ? true : false;
    return {
      charging,
      isWorn,
    };
  }
}
