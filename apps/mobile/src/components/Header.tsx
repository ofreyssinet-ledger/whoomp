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
} from '../hooks/connectedDeviceHooks';
import {useAppState} from '../context/AppStateContext';

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

const DeviceStatus = () => {
  const displayedDevice = useDisplayedDeviceOrThrow();
  return <Text style={{fontSize: 14, color: 'gray'}}>Last sync: N/A</Text>;
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

  return (
    <Text style={{fontSize: 14, color: 'gray', opacity: 0.8}}>
      {heartRate ?? 'N/A'} bpm ♡
    </Text>
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
    <View
      style={{
        flexDirection: 'column',
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        width: '100%',
      }}>
      <Pressable onPress={toggleExpanded}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <View style={{rowGap: 4}}>
            <DeviceName />
            <DeviceStatus />
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
          {Boolean(connectedDevice) && <DisconnectButton />}
          {!connectedDevice && <ConnectAnotherDeviceButton />}
        </View>
      )}
    </View>
  );

  //   return (
  //     <View>
  //       {connectedDevice ? (
  //         <>
  //           <Text>
  //             Connected Device: {connectedDevice.name} (ID: {connectedDevice.id})
  //           </Text>
  //           <Button
  //             title="Disconnect"
  //             color="red"
  //             onPress={() => {
  //               connectedDevice.disconnect();
  //             }}
  //           />
  //         </>
  //       ) : displayedDevice ? (
  //         <>
  //           <Text>
  //             Displayed Device: {displayedDevice.deviceName} (not connected)
  //           </Text>
  //           <Button
  //             title="Connect"
  //             disabled={connecting}
  //             onPress={handleConnect}
  //           />
  //         </>
  //       ) : (
  //         <Text>No device displayed</Text>
  //       )}
  //     </View>
  //   );
}
