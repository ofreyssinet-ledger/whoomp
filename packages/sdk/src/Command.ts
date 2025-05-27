import { WhoopPacket } from './WhoopPacket';

export interface Command<Result, Params> {
  params: Params;
  id: string;
  makePacket(): WhoopPacket;
  parseResponse(packet: WhoopPacket): Result;
}
