import React, {useEffect} from 'react';
import {
  View,
  Button,
  Text,
  Touchable,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {useScanDevices} from '../hooks/useScanDevices';
import {DiscoveredDevice} from '@whoomp/sdk';
import {useConnectToDevice} from '../hooks/useConnectToDevice';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useConnectingContext} from '../context/ConnectingContext';

const ScannedDevice: React.FC<{
  device: DiscoveredDevice;
}> = ({device}) => {
  const {connecting, connect, error} = useConnectToDevice(device.id);

  const handlePress = () => {
    if (!connecting) {
      connect();
    }
  };

  useEffect(() => {
    if (error) {
      Alert.alert('Connection Error', error.message);
    }
  }, [error]);

  return (
    <TouchableOpacity onPress={handlePress}>
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: '#f0f0f0',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 16,
          height: 64,
          borderRadius: 8,
        }}>
        <Text style={{fontSize: 16, fontWeight: 'bold'}}>{device.name}</Text>
        <View style={{flex: 1}} />
        {connecting ? (
          <Text style={{fontSize: 14, color: 'gray'}}>connecting...</Text>
        ) : (
          <Text style={{fontSize: 14, color: 'gray'}}>tap to connect</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

export function ConnectionScreen() {
  const {discoveredDevices, startScanning, stopScanning, scanning, error} =
    useScanDevices();
  const {connecting} = useConnectingContext();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        padding: 16,
      }}>
      {scanning || connecting ? (
        <View style={{rowGap: 24, width: '100%', flex: 1}}>
          <Text style={{fontSize: 48, fontWeight: 'bold', marginBottom: 16}}>
            Scanning...
          </Text>
          <View
            style={{
              flexDirection: 'column',
              flex: 1,
              rowGap: 14,
            }}>
            {discoveredDevices.map(device => (
              <ScannedDevice key={device.id} device={device} />
            ))}
          </View>
          <Button title="Stop Scan" color="red" onPress={stopScanning} />
          <View />
        </View>
      ) : (
        <Button title="Start Scan" onPress={startScanning} />
      )}
      {error && <Text>Error: {error.message}</Text>}
    </View>
  );
}
