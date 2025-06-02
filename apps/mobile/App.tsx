// App.tsx
import React, {use, useEffect, useState} from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Button,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  GetHelloHarvardCommand,
  GetBatteryLevelCommand,
  GetClockCommand,
  ReportVersionInfoCommand,
  type ConnectedDevice as SDKConnectedDevice,
  Sdk,
  ConnectedDevice,
} from '@whoomp/sdk';
import {ReactNativeBleTransport} from './RNBleTransport';
import {firstValueFrom, Subscription} from 'rxjs';

type Props = {
  connectedDevice: SDKConnectedDevice;
  sdk: Sdk;
};

const ConnectedDeviceItem: React.FC<Props> = ({connectedDevice, sdk}) => {
  const {id, name} = connectedDevice;
  const [heartRate, setHeartRate] = useState<number | null>(null);

  useEffect(() => {
    let dead = false;
    let sub: Subscription | null = null;

    sdk.observeHeartRateEvents(id).then(obs => {
      sub = obs.subscribe(events => {
        if (dead) return;
        const last = events[events.length - 1];
        if (last) setHeartRate(last.bpm);
      });
    });

    return () => {
      dead = true;
      sub?.unsubscribe();
      console.log(`Unsubscribed heart rate from ${id}`);
    };
  }, [id, sdk]);

  const send = async (cmd: any, label: string) => {
    try {
      const res = await sdk.sendCommand(id, cmd);
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
    <View style={styles.deviceContainer}>
      <Text>ID: {id}</Text>
      <Text>Name: {name}</Text>
      <Text>
        Heart Rate: {heartRate != null ? `${heartRate} bpm` : 'Not streaming'}
      </Text>
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
      <Button
        title={
          heartRate != null ? 'Disable Real-Time HR' : 'Enable Real-Time HR'
        }
        onPress={() => sdk.toggleRealTimeHR(id)}
      />
      <Button
        title="Disconnect"
        color="red"
        onPress={async () => {
          await sdk.disconnectFromDevice(id);
          console.log(`Disconnected ${id}`);
        }}
      />
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

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {padding: 16},
  spacer: {height: 16},
  heading: {fontSize: 18, marginVertical: 8},
  deviceContainer: {
    marginVertical: 12,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
});
