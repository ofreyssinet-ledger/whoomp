// new WhoopPacket(PacketType.COMMAND, 0, CommandNumber.TOGGLE_REALTIME_HR, new Uint8Array([isRealtimeActive ? 0x01 : 0x00])).framedPacket();

import { Command } from '../Command';
import { PacketType, CommandNumber, WhoopPacket } from '../WhoopPacket';

export class ToggleRealtimeHRCommand implements Command<void> {
  readonly id = 'ToggleRealtimeHRCommand';
  readonly withResponse = false;
  private params: boolean;

  constructor(isRealtimeActive: boolean) {
    this.params = isRealtimeActive;
  }

  makePacket(): WhoopPacket {
    return new WhoopPacket(
      PacketType.COMMAND,
      0,
      CommandNumber.TOGGLE_REALTIME_HR,
      new Uint8Array([this.params ? 0x01 : 0x00]),
    );
  }

  parseResponse(): void {}
}
