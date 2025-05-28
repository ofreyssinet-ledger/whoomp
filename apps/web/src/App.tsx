import { useEffect, useState } from 'react';
import './App.css';
import {
  GetHelloHarvardCommand,
  Sdk,
  GetBatteryLevelCommand,
  GetClockCommand,
  ReportVersionInfoCommand,
  type ConnectedDevice,
} from '@whoomp/sdk';
import { WebBleTransport } from '@whoomp/transport-web-ble';
import { firstValueFrom } from 'rxjs';

const ConnectedDevice: React.FC<{
  connectedDevice: ConnectedDevice;
  sdk: Sdk;
}> = ({ connectedDevice, sdk }) => {
  const { id, name } = connectedDevice;

  const sendGetHarvardCommand = async () => {
    const helloCommand = new GetHelloHarvardCommand();
    const response = await sdk.sendCommand(id, helloCommand);
    console.log('Response from GetHelloHarvardCommand:', response);
  };

  const sendGetBatteryCommand = async () => {
    const batteryCommand = new GetBatteryLevelCommand();
    const response = await sdk.sendCommand(id, batteryCommand);
    console.log('Response from GetBatteryLevelCommand:', response);
  };

  const sendGetClockCommand = async () => {
    const clockCommand = new GetClockCommand();
    const response = await sdk.sendCommand(id, clockCommand);
    console.log('Response from GetClockCommand:', response);
  };

  const sendReportVersionCommand = async () => {
    const versionCommand = new ReportVersionInfoCommand();
    const response = await sdk.sendCommand(id, versionCommand);
    console.log('Response from ReportVersionInfoCommand:', response);
  };

  const disconnect = async () => {
    await sdk.disconnectFromDevice(id);
    console.log(`Disconnected from device with ID: ${id}`);
  };

  return (
    <div>
      <p>ID: {id}</p>
      <p>Name: {name}</p>
      <button onClick={sendGetHarvardCommand}>Get Hello Harvard</button>
      <button onClick={sendGetBatteryCommand}>Get Battery Level</button>
      <button onClick={sendGetClockCommand}>Get Clock</button>
      <button onClick={sendReportVersionCommand}>Report Version Info</button>
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
    [id: string]: ConnectedDevice;
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
          const [device] = await firstValueFrom(sdk.getDevices());
          console.log('Discovered devices:', device);
          const connectedDeviceId = await sdk.connectToDevice(device.id, () => {
            console.log(`Device ${device.id} disconnected`);
          });
          console.log('Connected to device with ID:', connectedDeviceId);
        }}
      >
        sdk.getDevices()
      </button>
      {Object.values(connectedDevices).length > 0 ? (
        <div>
          <h2>Connected Devices</h2>
          {Object.values(connectedDevices).map((device) => (
            <ConnectedDevice
              key={device.id}
              connectedDevice={device}
              sdk={sdk}
            />
          ))}
        </div>
      ) : (
        <p>No connected devices</p>
      )}
    </div>
  );
}

export default App;
