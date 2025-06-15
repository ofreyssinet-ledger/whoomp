import {
  filterDataDumpStorageKeys,
  GetBatteryLevelCommand,
  GetClockCommand,
  GetHelloHarvardCommand,
  ReportVersionInfoCommand,
  Sdk,
  serializeHistoricalDataDump,
  type ConnectedDevice as SDKConnectedDevice,
} from '@whoomp/sdk';

import React, {useEffect, useMemo, useState} from 'react';
import {
  Alert,
  Button,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {firstValueFrom} from 'rxjs';
import {ReactNativeBleTransport} from './RNBleTransport';
import {mobileStorage, storage} from './data/MobileStorage';
import {exportTextData} from './data/exportData';
import {
  useDeviceSessionState,
  useDeviceState,
  useHeartRate,
  useMostRecentHistoricalData,
} from './hooks/connectedDeviceHooks';
import {useStateFromObservable} from './hooks/useStateFromObservable';
import {useSQLiteContext} from 'expo-sqlite';
import DBProvider from './context/DBProvider';

type ConnectedDeviceProps = {
  connectedDevice: SDKConnectedDevice;
};

const SendCommandsComponent: React.FC<{
  connectedDevice: SDKConnectedDevice;
}> = ({connectedDevice}) => {
  const send = async (cmd: any, label: string) => {
    try {
      const res = await connectedDevice.sendCommand(cmd);
      Alert.alert(
        'Command Response',
        `Response for ${label}:\n${JSON.stringify(res, null, 2)}`,
        [{text: 'OK'}],
      );
      console.log(`${label} response:`, res);
    } catch (e) {
      console.error(label, e);
    }
  };

  return (
    <>
      <Button
        title="Get Hello Harvard"
        onPress={() =>
          send(new GetHelloHarvardCommand(), 'GetHelloHarvardCommand')
        }
      />
      <Button
        title="Get Battery Level"
        onPress={() =>
          send(new GetBatteryLevelCommand(), 'GetBatteryLevelCommand')
        }
      />
      <Button
        title="Get Clock"
        onPress={() => send(new GetClockCommand(), 'GetClockCommand')}
      />
      <Button
        title="Report Version Info"
        onPress={() =>
          send(new ReportVersionInfoCommand(), 'ReportVersionInfoCommand')
        }
      />
    </>
  );
};

const KeepAwake = () => {
  // TODO: Implement a keep-awake mechanism (aka wakelock)
  return null;
};

const MostRecentHistoricalDataPacket: React.FC<{
  connectedDevice: SDKConnectedDevice;
}> = ({connectedDevice}) => {
  const mostRecent = useMostRecentHistoricalData(connectedDevice, 1000);
  const deviceSessionState = useDeviceSessionState(connectedDevice);

  if (!mostRecent) {
    return (
      <View style={styles.dataContainer}>
        <Text>No historical data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.dataContainer}>
      <Text style={{fontSize: 14, fontWeight: 'bold'}}>
        Most Recent Historical Data
      </Text>
      <Text style={{fontSize: 14, color: 'grey'}}>
        Date: {new Date(mostRecent.timestampMs).toISOString()}
      </Text>
      <Text style={{fontSize: 13, fontWeight: 'bold'}}>
        Heart Rate: {mostRecent.heartRate} bpm
      </Text>
      <View style={{marginTop: 8}}>
        {deviceSessionState?.downloadingHistoricalData ? (
          <Text style={{fontSize: 14, fontWeight: 'bold', color: 'orange'}}>
            Streaming historical data...{'\n'}⚠️ Do not quit the app or
            disconnect the device while streaming historical data. It will be
            lost if you do so.
          </Text>
        ) : (
          <Text style={{fontSize: 14, fontStyle: 'italic'}}>
            Not currently streaming historical data
          </Text>
        )}
      </View>
    </View>
  );
};

const ConnectedDeviceItem: React.FC<ConnectedDeviceProps & {sdk: Sdk}> = ({
  connectedDevice,
  sdk,
}) => {
  const {id, name} = connectedDevice;
  const deviceState = useDeviceState(connectedDevice);
  const heartRate = useHeartRate(connectedDevice);
  const deviceSessionState = useDeviceSessionState(connectedDevice);

  return (
    <View style={styles.deviceContainer}>
      {deviceSessionState?.downloadingHistoricalData ? <KeepAwake /> : null}
      <Text style={{fontSize: 14, fontWeight: 'bold'}}>Name: {name}</Text>
      <Text style={{fontSize: 14, color: 'grey'}}>ID: {id}</Text>
      <View style={styles.dataContainer}>
        <Text>
          Device State:{' '}
          {deviceState ? JSON.stringify(deviceState, null, 2) : 'N/A'}
        </Text>
      </View>
      <View style={{marginVertical: 12}}>
        <Button
          title="Reboot Strap"
          color="green"
          onPress={async () => {
            try {
              await connectedDevice.rebootStrap();
              console.log(`Rebooted strap for ${id}`);
            } catch (e) {
              console.error(`Error rebooting strap for ${id}:`, e);
            }
          }}
        />
        <Button
          title="Disconnect"
          color="red"
          onPress={async () => {
            await connectedDevice.disconnect();
            console.log(`Disconnected ${id}`);
          }}
        />
      </View>
      {/* <SendCommandsComponent connectedDevice={connectedDevice} /> */}
      <Button
        title={
          deviceState?.realtimeHeartRateEnabled
            ? 'Disable Real-Time HR'
            : 'Enable Real-Time HR'
        }
        onPress={() => connectedDevice.toggleRealTimeHR()}
      />
      <View style={styles.dataContainer}>
        <Text style={{fontSize: 13, fontWeight: 'bold'}}>
          Heart Rate: {heartRate != null ? `${heartRate} bpm` : 'Not streaming'}
        </Text>
      </View>
      <Button
        title={'Download historical data packets'}
        disabled={deviceSessionState?.downloadingHistoricalData}
        onPress={() => {
          sdk
            .downloadHistoricalData(id, 3600 * 3) // approx 3 hours of data
            .then(packets => {
              console.log(`Historical data packets for ${id}:`, packets);
            })
            .catch(err => {
              console.error(
                `Error getting historical data packets for ${id}:`,
                err,
              );
            });
        }}
      />
      <Button
        title="Abort download"
        disabled={!deviceSessionState?.downloadingHistoricalData}
        onPress={() => {
          connectedDevice.abortDownload();
        }}
      />
      <Button
        title="Analyse last 48h data"
        onPress={() => {
          sdk
            .analyseLast48hData(id)
            .then(analysis => {
              console.log(`Analysis for ${id}:`, analysis);
            })
            .catch(err => {
              console.error(`Error analysing data for ${id}:`, err);
            });
        }}
      />
      <Button
        title="Export 48h historical data"
        onPress={() => {
          console.log(`Exporting historical data for ${id}...`);
          sdk
            .getMergedHistoricalDataDump(
              id,
              new Date(Date.now() - 48 * 60 * 60 * 1000),
            )
            .then(dump => {
              console.log(`Merged historical data dump for ${id}:`);

              const serializedData = serializeHistoricalDataDump(
                dump.deviceName,
                dump.date,
                dump.dataDump,
                false, // Exclude original data for export
              );
              console.log('serializedData:', serializedData.length);
              exportTextData({
                data: serializedData,
                filename: `historical_data_${
                  dump.deviceName
                }_${dump.date.toISOString()}`,
              });
            })
            .catch(err => {
              console.error(`Error exporting data for ${id}:`, err);
            });
        }}
      />
      <MostRecentHistoricalDataPacket connectedDevice={connectedDevice} />
    </View>
  );
};

function useSdk(): Sdk {
  const db = useSQLiteContext();
  const [sdk] = useState(() => {
    const transport = new ReactNativeBleTransport();
    return new Sdk(transport, mobileStorage(db));
  });
  return sdk;
}

export function App() {
  const sdk = useSdk();

  useEffect(() => {
    const storageKeys = storage.getAllKeys();
    const historicalDataKeys = filterDataDumpStorageKeys(storageKeys);
    console.log('[App] Initializing SDK with storage keys:', {
      storageKeys,
      historicalDataKeys,
    });
  }, []);

  useEffect(() => {
    return () => {
      sdk.destroy();
    };
  }, [sdk]);

  const connectedDevicesObservable = useMemo(() => {
    return sdk.observeConnectedDevices();
  }, [sdk]);

  const connectedDevices =
    useStateFromObservable(connectedDevicesObservable) ?? {};

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.spacer} />
        <Button
          title="Connect to a WHOOP device"
          onPress={async () => {
            const [dev] = await firstValueFrom(sdk.getDevices());
            console.log('Discovered:', dev);
            const id = await sdk.connectToDevice(dev.id, () =>
              console.log(`Disconnected callback for ${dev.id}`),
            );
            console.log('Connected:', id);
          }}
        />
        <View style={styles.spacer} />
        {Object.values(connectedDevices).length > 0 ? (
          <>
            <Text style={styles.heading}>Connected Devices</Text>
            {Object.values(connectedDevices).map(d => (
              <ConnectedDeviceItem key={d.id} connectedDevice={d} sdk={sdk} />
            ))}
          </>
        ) : (
          <Text>No connected devices</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function AppWrapper() {
  return (
    <DBProvider>
      <App />
    </DBProvider>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#fff'},
  content: {padding: 16},
  spacer: {height: 16},
  heading: {fontSize: 18, marginVertical: 8},
  deviceContainer: {
    marginVertical: 12,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  dataContainer: {
    padding: 12,
    marginTop: 12,
    backgroundColor: '#f0f0f0',
  },
});
