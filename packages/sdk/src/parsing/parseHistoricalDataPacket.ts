import { WhoopPacket } from '../WhoopPacket';

export type ParsedHistoricalDataPacket = {
  date: Date;
  datePrecise: Date;
  unix: number; // seconds since epoch
  subseconds: number; // 0..32768 fraction of a second
  unknown: number; // Unknown field, needs further investigation
  heartRate: number; // Heart rate in bpm
  rr: number[]; // Array of RR intervals in milliseconds
};

export function parseHistoricalDataPacket(
  packet: WhoopPacket,
): ParsedHistoricalDataPacket {
  const view = new DataView(packet.data.buffer, packet.data.byteOffset);

  const unix = view.getUint32(4, true); // seconds since epoch
  const subsec = view.getUint16(8, true); // 0..32768 fraction of a second
  // Convert UNIX timestamp (seconds) to a JS Date:
  const date = new Date(unix * 1000);
  const subsecMs = (subsec / 32768) * 1000;

  const datePrecise = new Date(unix * 1000 + subsecMs);
  const unk = view.getUint32(10, true);
  const heart = view.getUint8(14);

  // Number of RR values (0–4)
  const rrnum = view.getUint8(15);

  // Read up to four 16-bit RR intervals (LE) at offsets 16,18,20,22
  const rr1 = view.getUint16(16, true);
  const rr2 = view.getUint16(18, true);
  const rr3 = view.getUint16(20, true);
  const rr4 = view.getUint16(22, true);

  let rr: number[] = [];
  switch (rrnum) {
    case 1:
      rr = [rr1];
      break;
    case 2:
      rr = [rr1, rr2];
      break;
    case 3:
      rr = [rr1, rr2, rr3];
      break;
    case 4:
      rr = [rr1, rr2, rr3, rr4];
      break;
    case 0:
      rr = [];
      break;
    default:
      console.error(`Unexpected rrnum: ${rrnum}`);
      rr = [];
  }

  return {
    date,
    datePrecise,
    unix,
    subseconds: subsec,
    unknown: unk,
    heartRate: heart,
    rr,
  };
}
