import { useEffect, useState } from 'react';
import './App.css';
import {
  Sdk,
  type ConnectedDevice as SDKConnectedDevice,
  type DeviceState,
} from '@whoomp/sdk';
import { WebBleTransport } from '@whoomp/transport-web-ble';
import { firstValueFrom } from 'rxjs';

const useDeviceState = (
  connectedDevice: SDKConnectedDevice,
): DeviceState | null => {
  const [deviceState, setDeviceState] = useState<DeviceState | null>(null);

  useEffect(() => {
    let dead = false;
    const stateSub = connectedDevice.deviceStateObservable.subscribe(
      (state) => {
        if (dead) return;
        setDeviceState(state);
        console.log(`Device state updated for ${connectedDevice.id}:`, state);
      },
    );

    return () => {
      dead = true;
      stateSub.unsubscribe();
      console.log(`Unsubscribed device state for ${connectedDevice.id}`);
    };
  }, [connectedDevice]);

  return deviceState;
};

const useHeartRate = (connectedDevice: SDKConnectedDevice): number | null => {
  const [heartRate, setHeartRate] = useState<number | null>(null);

  useEffect(() => {
    let dead = false;
    const hrSub = connectedDevice.heartRateFromStrapObservable.subscribe(
      (events) => {
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

const ConnectedDevice: React.FC<{
  connectedDevice: SDKConnectedDevice;
}> = ({ connectedDevice }) => {
  const { id, name } = connectedDevice;

  const heartRate = useHeartRate(connectedDevice);
  const deviceState = useDeviceState(connectedDevice);

  const toggleRealtimeHR = async () => {
    await connectedDevice.toggleRealTimeHR();
  };

  const disconnect = async () => {
    await connectedDevice.disconnect();
    console.log(`Disconnected from device with ID: ${id}`);
  };

  return (
    <div>
      <p>ID: {id}</p>
      <p>Name: {name}</p>
      <p>Heart Rate: {heartRate !== null ? `${heartRate} bpm` : 'N/A'}</p>
      <pre>Device State: {JSON.stringify(deviceState, null, 2)}</pre>
      <button onClick={toggleRealtimeHR}>
        {heartRate !== null ? 'Disable' : 'Enable'} Real-Time HR
      </button>
      <button onClick={disconnect}>Disconnect</button>
    </div>
  );
};

function App() {
  const [sdk] = useState(() => {
    const transport = new WebBleTransport();
    return new Sdk(transport);
  });

  const [connectedDevices, setConnectedDevices] = useState<{
    [id: string]: SDKConnectedDevice;
  }>({});

  useEffect(() => {
    const subscription = sdk.observeConnectedDevices().subscribe((devices) => {
      console.log('Connected devices updated:', devices);
      setConnectedDevices(devices);
    });
    return () => {
      console.log('Unsubscribing from connected devices');
      subscription.unsubscribe();
    };
  }, [sdk]);

  return (
    <div>
      <button onClick={() => console.log(sdk.helloWorld())}>
        sdk.helloWorld()
      </button>
      <button
        onClick={async () => {
          try {
            const [device] = await firstValueFrom(sdk.getDevices());
            console.log('Discovered devices:', device);
            const connectedDevice = await sdk.connectToDevice(device.id, () => {
              console.log(`Device ${device.id} disconnected`);
            });
            console.log('Connected to device', connectedDevice);
          } catch (error) {
            console.error(error);
          }
        }}
      >
        Connect to a device
      </button>
      {Object.values(connectedDevices).length > 0 ? (
        <div>
          <h2>Connected Devices</h2>
          {Object.values(connectedDevices).map((device) => (
            <ConnectedDevice key={device.id} connectedDevice={device} />
          ))}
        </div>
      ) : (
        <p>No connected devices</p>
      )}
    </div>
  );
}

export default App;
