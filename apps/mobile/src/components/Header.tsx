import React, {useEffect} from 'react';
import {
  Button,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  Touchable,
  View,
} from 'react-native';
import {useDisplayedDeviceOrThrow} from '../context/DisplayedDeviceContext';
import {
  useDisplayedConnectedDevice,
  useDisplayedConnectedDeviceThrowIfNull,
} from '../context/DisplayedConnectedDeviceContext';
import {useConnectToDevice} from '../hooks/useConnectToDevice';
import {
  useDeviceSessionState,
  useDeviceState,
  useHeartRate,
  useMostRecentHistoricalData,
} from '../hooks/connectedDeviceHooks';
import {useAppState} from '../context/AppStateContext';
import {useSdk} from '../context/SdkContext';
import BeatingHeart from './BeatingHeart';
import {KeepAwake} from './KeepAwake';
import {useDataCounts} from '../hooks/useDataCounts';
import {useLastSyncDate} from '../hooks/useLastSyncDate';

const monospaceFont = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

const styles = StyleSheet.create({
  codeblock: {
    fontFamily: monospaceFont,
    fontSize: 12,
    color: 'gray',
    opacity: 0.8,
  },
});

const DeviceName = () => {
  const displayedDevice = useDisplayedDeviceOrThrow();
  return (
    <Text style={{fontSize: 16, fontWeight: 'bold'}}>
      {displayedDevice.deviceName}
    </Text>
  );
};

const DeviceStatusNotConnected = () => {
  const lastSyncDate = useLastSyncDate();

  const lastSyncReadableDate = lastSyncDate
    ? lastSyncDate.toLocaleString()
    : 'N/A';

  return (
    <Text style={{fontSize: 14, color: 'gray'}}>
      Last sync: {lastSyncReadableDate}
    </Text>
  );
};

const DeviceStatusConnected = () => {
  const lastSyncDate = useLastSyncDate();

  const lastSyncReadableDate = lastSyncDate
    ? lastSyncDate.toLocaleString()
    : 'N/A';

  const connectedDevice = useDisplayedConnectedDeviceThrowIfNull();
  const deviceSessionState = useDeviceSessionState(connectedDevice);

  const {downloadingHistoricalData} = deviceSessionState || {};

  const mostRecentHistoricalData = useMostRecentHistoricalData(
    connectedDevice,
    1000,
  );

  const mostRecentPacketDate = mostRecentHistoricalData
    ? new Date(mostRecentHistoricalData.timestampMs)
    : null;

  return (
    <Text style={{fontSize: 14, color: 'gray'}}>
      {downloadingHistoricalData && <KeepAwake />}
      {downloadingHistoricalData && mostRecentPacketDate
        ? `Syncing... ${mostRecentPacketDate.toLocaleDateString()}, ${mostRecentPacketDate.toLocaleTimeString()}`
        : `Last sync: ${lastSyncReadableDate}`}
    </Text>
  );
};

const ConnectButton = () => {
  const displayedDevice = useDisplayedDeviceOrThrow();

  const {connect, connecting, error} = useConnectToDevice(
    displayedDevice.deviceId,
  );

  const handleConnect = () => {
    if (connecting) {
      return;
    }
    connect();
  };

  return (
    <Button
      title={connecting ? 'Connecting...' : 'Connect'}
      disabled={connecting}
      onPress={handleConnect}
    />
  );
};

const DisconnectButton = () => {
  const connectedDevice = useDisplayedConnectedDevice();

  if (!connectedDevice) {
    return null;
  }

  return (
    <Button
      title="Disconnect"
      color="red"
      onPress={() => {
        connectedDevice.disconnect();
      }}
    />
  );
};

const ConnectAnotherDeviceButton = () => {
  const {setDisplayedDevice} = useAppState();
  return (
    <Button
      title="Connect Another Device"
      onPress={() => {
        setDisplayedDevice(null);
      }}
    />
  );
};

const HeartRate = () => {
  const connectedDevice = useDisplayedConnectedDeviceThrowIfNull();

  const heartRate = useHeartRate(connectedDevice);

  if (heartRate === null || heartRate === 0)
    return (
      <Text style={{fontSize: 14, color: 'gray', opacity: 0.8}}>
        Heart Rate: N/A
      </Text>
    );

  return (
    <View style={{flexDirection: 'row', alignItems: 'center', opacity: 0.8}}>
      <Text style={{fontSize: 14, color: 'gray', marginRight: 4}}>
        {heartRate} bpm
      </Text>
      <View style={{marginTop: 1}}>
        <BeatingHeart bpm={heartRate} size={14} color="grey" />
      </View>
    </View>
  );
};

const DeviceBattery = () => {
  const connectedDevice = useDisplayedConnectedDeviceThrowIfNull();

  const {batteryLevel, charging} = useDeviceState(connectedDevice) || {};

  return (
    <View style={{flexDirection: 'row', alignItems: 'center'}}>
      <Text style={{fontSize: 14, color: 'gray', opacity: 0.8}}>
        {batteryLevel ? `${batteryLevel}%` : 'Battery: N/A'}
      </Text>
      {charging && (
        <Text
          style={{fontSize: 14, color: 'gray', opacity: 0.8, marginLeft: 8}}>
          (Charging)
        </Text>
      )}
    </View>
  );
};

const DeviceState = () => {
  const connectedDevice = useDisplayedConnectedDeviceThrowIfNull();

  const deviceState = useDeviceState(connectedDevice) || {};

  return (
    <View style={{backgroundColor: '#f8f8f8', padding: 8, borderRadius: 4}}>
      <Text style={{fontSize: 16, fontWeight: 'bold'}}>Device State</Text>
      <Text style={styles.codeblock}>
        {deviceState ? JSON.stringify(deviceState, null, 2) : 'N/A'}
      </Text>
      <DeviceClockChecker />
    </View>
  );
};

const DataCounts = () => {
  const dataCounts = useDataCounts();
  return (
    <View style={{backgroundColor: '#f8f8f8', padding: 8, borderRadius: 4}}>
      <Text style={{fontSize: 16, fontWeight: 'bold'}}>Data Counts</Text>
      <Text style={styles.codeblock}>
        {JSON.stringify(dataCounts, null, 2)}
      </Text>
    </View>
  );
};

const DeviceClockChecker = () => {
  const [now, setNow] = React.useState(new Date());
  const connectedDevice = useDisplayedConnectedDeviceThrowIfNull();

  const deviceState = useDeviceState(connectedDevice);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!deviceState) return;

  return (
    <View style={{flexDirection: 'column'}}>
      <Text style={styles.codeblock}>
        Device clock: {new Date((deviceState.clock ?? 0) * 1000).toUTCString()}
        {'\n'}
        Local clock:{'  '}
        {now.toUTCString()}
      </Text>
    </View>
  );
};

const DeviceSessionState = () => {
  const connectedDevice = useDisplayedConnectedDeviceThrowIfNull();

  const sessionState = useDeviceSessionState(connectedDevice) || {};

  return (
    <View style={{backgroundColor: '#f8f8f8', padding: 8, borderRadius: 4}}>
      <Text style={{fontSize: 16, fontWeight: 'bold'}}>Session State</Text>
      <Text style={styles.codeblock}>
        {sessionState ? JSON.stringify(sessionState, null, 2) : 'N/A'}
      </Text>
    </View>
  );
};

const SyncButton = () => {
  const connectedDevice = useDisplayedConnectedDeviceThrowIfNull();
  const sdk = useSdk();

  const [syncing, setSyncing] = React.useState(false);

  const handlePress = (entireHistory = false) => {
    if (syncing) {
      // If already syncing, abort the sync
      sdk.abortAllDownloads();
      setSyncing(false);
      return;
    } else {
      setSyncing(true);

      function sync() {
        sdk
          .syncDeviceData(
            connectedDevice.id,
            entireHistory ? new Date(0) : undefined,
          )
          .catch(error => {
            console.error('Sync failed:', error);
            setSyncing(false);
          })
          .finally(() => {
            setSyncing(false);
          });
      }
      if (entireHistory) {
        Alert.alert(
          'Syncing entire history',
          'This will rewrite all historical data. Are you sure?',
          [
            {
              text: 'Cancel',
              onPress: () => setSyncing(false),
              style: 'cancel',
            },
            {
              text: 'OK',
              onPress: sync,
            },
          ],
        );
      } else {
        sync();
      }
    }
  };

  return (
    <>
      <Button
        title={syncing ? 'Abort sync' : 'Sync'}
        disabled={syncing}
        onPress={() => handlePress()}
      />
      <Button
        title={syncing ? 'Abort sync' : 'Resync entire history'}
        disabled={syncing}
        onPress={() => handlePress(true)}
      />
    </>
  );
};

export default function Header() {
  const connectedDevice = useDisplayedConnectedDevice();

  const [expanded, setExpanded] = React.useState(false);
  const toggleExpanded = () => setExpanded(!expanded);

  useEffect(() => {
    if (!connectedDevice) {
      setExpanded(false);
    }
  }, [connectedDevice]);

  return (
    <View style={{width: '100%'}}>
      <View
        style={{
          marginHorizontal: 16,
          paddingHorizontal: 16,
          flexDirection: 'column',
          backgroundColor: '#f0f0f0',
          paddingVertical: 8,
          borderRadius: 8,
        }}>
        <Pressable onPress={toggleExpanded}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <View style={{rowGap: 4}}>
              <DeviceName />
              {connectedDevice ? (
                <DeviceStatusConnected />
              ) : (
                <DeviceStatusNotConnected />
              )}
            </View>
            <View style={{flex: 1}} />
            {Boolean(connectedDevice) ? (
              <View style={{rowGap: 4, alignItems: 'flex-end'}}>
                <DeviceBattery />
                <HeartRate />
              </View>
            ) : (
              <ConnectButton />
            )}
          </View>
        </Pressable>
        {expanded && (
          <View style={{marginTop: 16, rowGap: 8}}>
            {Boolean(connectedDevice) && <DeviceState />}
            {Boolean(connectedDevice) && <DeviceSessionState />}
            <DataCounts />
            {Boolean(connectedDevice) && <SyncButton />}
            {Boolean(connectedDevice) && <DisconnectButton />}
            {!connectedDevice && <ConnectAnotherDeviceButton />}
          </View>
        )}
      </View>
    </View>
  );
}
