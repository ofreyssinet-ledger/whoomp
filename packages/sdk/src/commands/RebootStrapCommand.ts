import { Command } from '../Command';
import { PacketType, CommandNumber, WhoopPacket } from '../WhoopPacket';

export class RebootStrapCommand implements Command<void> {
  readonly id = 'RebootStrapCommand';
  readonly withResponse = false;

  makePacket(): WhoopPacket {
    return new WhoopPacket(
      PacketType.COMMAND,
      0,
      CommandNumber.REBOOT_STRAP,
      new Uint8Array([0x00]),
    );
  }

  parseResponse(): void {}
}
