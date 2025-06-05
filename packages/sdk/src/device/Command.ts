import { WhoopPacket } from './WhoopPacket';

export interface Command<Result> {
  id: string;
  makePacket(): WhoopPacket;
  withResponse: boolean;
  parseResponse(packet: WhoopPacket): Result;
}
