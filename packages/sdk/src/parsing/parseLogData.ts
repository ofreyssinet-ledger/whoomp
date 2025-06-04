import { decodeUTF8 } from '../utils/decodeUTF8';

export function parseLogData(data: Uint8Array): string {
  // Slice from index 7 to the second last element
  const slicedData = data.slice(7, data.length - 1);

  // Remove the invalid byte sequence `[0x34, 0x00, 0x01]` safely
  const cleanedData = [];
  for (let i = 0; i < slicedData.length; i++) {
    // Ensure we don't go out of bounds
    if (
      slicedData[i] === 0x34 &&
      slicedData[i + 1] === 0x00 &&
      slicedData[i + 2] === 0x01 &&
      i + 2 < slicedData.length
    ) {
      i += 2; // Skip the next two bytes safely
      // console.log('removed bad');
    } else {
      cleanedData.push(slicedData[i]);
    }
  }

  // Convert the cleaned data back into a Uint8Array
  const cleanedUint8Array = new Uint8Array(cleanedData);

  // Decode the cleaned data to a string
  const decodedString = decodeUTF8(cleanedUint8Array);

  return decodedString;
}
