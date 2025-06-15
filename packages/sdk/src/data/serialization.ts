import { HistoricalDataPacket } from './model';

const main_separator = ' ';
const sub_separator = ',';

function Uint8ArrayToString(arr: Uint8Array): string {
  return Array.from(arr)
    .map((b) => b.toString())
    .join(sub_separator);
}

function StringToUint8Array(str: string): Uint8Array {
  return new Uint8Array(str.split(',').map(Number));
}

const placeholderUint8Array = new Uint8Array(0);

export function serializeHistoricalDataPacket(
  packet: HistoricalDataPacket,
  includeOriginalData: boolean = true,
): string {
  const { timestampMs, heartRate, rr, unknown } = packet;
  return [
    timestampMs.toString(),
    heartRate.toString(),
    JSON.stringify(rr),
    unknown.toString(),
  ].join(main_separator);
}

export function deserializeHistoricalDataPacket(
  data: string,
): HistoricalDataPacket {
  const [timestampMs, heartRate, rr, unknown, ...originalData] =
    data.split(main_separator);
  const packet = {
    timestampMs: Number(timestampMs),
    heartRate: Number(heartRate),
    rr: JSON.parse(rr).map(Number),
    unknown: Number(unknown),
    originalData: StringToUint8Array(originalData.join(',')),
  };
  if (!historicalDataPacketTypeguard(packet)) {
    throw new Error('Invalid HistoricalDataPacket format');
  }
  return packet;
}

export function historicalDataPacketTypeguard(packet: unknown) {
  return (
    typeof packet === 'object' &&
    packet !== null &&
    'timestampMs' in packet &&
    'heartRate' in packet &&
    'rr' in packet &&
    'unknown' in packet &&
    'originalData' in packet &&
    typeof (packet as HistoricalDataPacket).timestampMs === 'number' &&
    !isNaN(packet.timestampMs as number) &&
    typeof (packet as HistoricalDataPacket).heartRate === 'number' &&
    !isNaN(packet.heartRate as number) &&
    Array.isArray((packet as HistoricalDataPacket).rr) &&
    !(packet.rr as number[]).some(isNaN) &&
    typeof (packet as HistoricalDataPacket).unknown === 'number' &&
    !isNaN(packet.unknown as number)
  );
}

function serializeDataPackets(
  dataPackets: HistoricalDataPacket[],
  includeOriginalData = true,
): string {
  return dataPackets
    .map((packet) => serializeHistoricalDataPacket(packet, includeOriginalData))
    .join('\n');
}

export function serializeHistoricalDataDump(
  deviceName: string,
  date: Date,
  dataDump: HistoricalDataPacket[],
  includeOriginalData: boolean = true,
): string {
  const serializedPackets = serializeDataPackets(dataDump, includeOriginalData);
  return `${deviceName}\n${date.toISOString()}\n${serializedPackets}`;
}

export function deserializeHistoricalDataDump(data: string): {
  deviceName: string;
  date: Date;
  dataDump: HistoricalDataPacket[];
} {
  const lines = data.split('\n');
  const deviceName = lines[0];
  const date = new Date(lines[1]);

  const dataDump = lines
    .slice(2)
    .reduce((acc: HistoricalDataPacket[], line: string) => {
      if (line.trim() === '') return acc; // Skip empty lines
      try {
        const packet = deserializeHistoricalDataPacket(line);
        acc.push(packet);
      } catch (error) {
        // console.error(`Error deserializing packet: ${line}`, error);
      }
      return acc;
    }, []);

  return { deviceName, date, dataDump };
}
