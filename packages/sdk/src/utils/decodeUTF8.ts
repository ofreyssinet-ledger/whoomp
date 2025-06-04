export function decodeUTF8(uint8Array: Uint8Array): string {
  let result = '';
  let i = 0;
  while (i < uint8Array.length) {
    const byte1 = uint8Array[i++];
    if (byte1 < 0x80) {
      result += String.fromCharCode(byte1);
    } else if (byte1 < 0xe0) {
      const byte2 = uint8Array[i++];
      result += String.fromCharCode(((byte1 & 0x1f) << 6) | (byte2 & 0x3f));
    } else if (byte1 < 0xf0) {
      const byte2 = uint8Array[i++];
      const byte3 = uint8Array[i++];
      result += String.fromCharCode(
        ((byte1 & 0x0f) << 12) | ((byte2 & 0x3f) << 6) | (byte3 & 0x3f),
      );
    } else {
      // Skip characters outside BMP
      i += 3;
      result += '?'; // or handle surrogate pairs
    }
  }
  return result;
}
