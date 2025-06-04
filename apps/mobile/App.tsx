// App.tsx
import {
  ConnectedDevice,
  DeviceSessionState,
  DeviceState,
  GetBatteryLevelCommand,
  GetClockCommand,
  GetHelloHarvardCommand,
  ParsedHistoricalDataPacket,
  ReportVersionInfoCommand,
  Sdk,
  type ConnectedDevice as SDKConnectedDevice,
} from '@whoomp/sdk';
import React, {useEffect, useState} from 'react';
import {
  Alert,
  Button,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {firstValueFrom, throttleTime} from 'rxjs';
import {ReactNativeBleTransport} from './RNBleTransport';

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

const useDeviceState = (
  connectedDevice: SDKConnectedDevice,
): DeviceState | null => {
  const [deviceState, setDeviceState] = useState<DeviceState | null>(null);

  useEffect(() => {
    let dead = false;
    const stateSub = connectedDevice.deviceStateObservable.subscribe(state => {
      if (dead) return;
      setDeviceState(state);
      console.log(`Device state updated for ${connectedDevice.id}:`, state);
    });

    return () => {
      dead = true;
      stateSub.unsubscribe();
      console.log(`Unsubscribed device state for ${connectedDevice.id}`);
    };
  }, [connectedDevice]);

  return deviceState;
};

const useDeviceSessionState = (
  connectedDevice: SDKConnectedDevice,
): DeviceSessionState | null => {
  const [deviceState, setDeviceState] = useState<DeviceSessionState | null>(
    null,
  );

  useEffect(() => {
    let dead = false;
    const stateSub = connectedDevice.deviceSessionState.subscribe(state => {
      if (dead) return;
      setDeviceState(state);
      console.log(
        `Device session state updated for ${connectedDevice.id}:`,
        state,
      );
    });

    return () => {
      dead = true;
      stateSub.unsubscribe();
      console.log(
        `Unsubscribed device session state for ${connectedDevice.id}`,
      );
    };
  }, [connectedDevice]);

  return deviceState;
};

const useHeartRate = (connectedDevice: SDKConnectedDevice): number | null => {
  const [heartRate, setHeartRate] = useState<number | null>(null);

  useEffect(() => {
    let dead = false;
    const hrSub = connectedDevice.heartRateFromStrapObservable.subscribe(
      events => {
        if (dead) return;
        const last = events[events.length - 1];
        if (last) setHeartRate(last.bpm);
      },
    );

    return () => {
      dead = true;
      hrSub.unsubscribe();
      console.log(`Unsubscribed heart rate from ${connectedDevice.id}`);
    };
  }, [connectedDevice]);

  return heartRate;
};

const useMostRecentHistoricalData = (
  connectedDevice: SDKConnectedDevice,
  /**
   * Throttle time in milliseconds for historical data updates.
   * Use at least 1000ms to avoid overwhelming the UI.
   */
  throttleTimeMs: number = 1000,
): {date: Date; heartRate: number} | null => {
  const [mostRecent, setMostRecent] =
    useState<ParsedHistoricalDataPacket | null>(null);

  useEffect(() => {
    let dead = false;
    const mostRecentPacketSub = connectedDevice.mostRecentHistoricalDataPacket
      .pipe(throttleTime(throttleTimeMs))
      .subscribe(packet => {
        if (dead) return;
        setMostRecent(packet);
      });

    return () => {
      dead = true;
      mostRecentPacketSub.unsubscribe();
      console.log(`Unsubscribed historical data from ${connectedDevice.id}`);
    };
  }, [connectedDevice]);

  return mostRecent;
};

const MostRecentHistoricalDataPacket: React.FC<{
  connectedDevice: SDKConnectedDevice;
}> = ({connectedDevice}) => {
  const mostRecent = useMostRecentHistoricalData(connectedDevice, 1000);
  const deviceSessionState = useDeviceSessionState(connectedDevice);

  if (!mostRecent) {
    return (
      <View style={styles.dataContainer}>
        <Text>No historical data available</Text>;
      </View>
    );
  }

  return (
    <View style={styles.dataContainer}>
      <Text style={{fontSize: 14, fontWeight: 'bold'}}>
        Most Recent Historical Data
      </Text>
      <Text style={{fontSize: 14, color: 'grey'}}>
        Date: {mostRecent.date.toISOString()}
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

const ConnectedDeviceItem: React.FC<ConnectedDeviceProps> = ({
  connectedDevice,
}) => {
  const {id, name} = connectedDevice;
  const deviceState = useDeviceState(connectedDevice);
  const heartRate = useHeartRate(connectedDevice);

  return (
    <View style={styles.deviceContainer}>
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
        title={'Get historical data packets'}
        onPress={() => {
          connectedDevice
            .getHistoricalDataPackets()
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
      <MostRecentHistoricalDataPacket connectedDevice={connectedDevice} />
    </View>
  );
};

export default function App() {
  const [sdk] = useState(() => {
    const transport = new ReactNativeBleTransport();
    return new Sdk(transport);
  });

  useEffect(() => {
    return () => {
      sdk.destroy();
    };
  }, [sdk]);

  const [connectedDevices, setConnectedDevices] = useState<{
    [id: string]: ConnectedDevice;
  }>({});

  useEffect(() => {
    const subscription = sdk.observeConnectedDevices().subscribe(devices => {
      console.log('Connected devices updated:', devices);
      setConnectedDevices(devices);
    });
    return () => {
      console.log('Unsubscribing from connected devices');
      subscription.unsubscribe();
    };
  }, [sdk]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Button
          title="sdk.helloWorld()"
          onPress={() => console.log(sdk.helloWorld())}
        />
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
              <ConnectedDeviceItem key={d.id} connectedDevice={d} />
            ))}
          </>
        ) : (
          <Text>No connected devices</Text>
        )}
      </ScrollView>
    </SafeAreaView>
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
