import Share from 'react-native-share';
import RNFetchBlob from 'rn-fetch-blob';

export async function exportTextData({
  data,
  filename,
}: {
  data: string;
  filename: string;
}) {
  try {
    console.log(`[exportTextData] Exporting data with filename: ${filename}`);
    console.log(`[exportTextData] Data converted to base64`);
    const date = new Date().toISOString().split('T')[0];

    const humanReadableName = `${filename}-${date}.txt`;
    const filePath = `${RNFetchBlob.fs.dirs.DocumentDir}/${humanReadableName}`;

    console.log(`[exportTextData] Exporting data to ${filePath}`);
    await RNFetchBlob.fs.writeFile(filePath, data, 'utf8');
    console.log(`[exportTextData] Data written to ${filePath}`);
    const options = {
      failOnCancel: false,
      saveToFiles: false,
      type: 'text/plain',
      url: `file://${filePath}`,
    };

    await Share.open(options);
    console.log(`[exportTextData] Data shared successfully`);
  } catch (err) {
    console.error(`[exportTextData] Error exporting data: ${err}`);
  }
}
