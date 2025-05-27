import { useState } from 'react';
import './App.css';
import { GetHelloHarvardCommand, Sdk } from '@whoomp/sdk';
import { WebBleTransport } from '@whoomp/transport-web-ble';
import { firstValueFrom } from 'rxjs';

function App() {
  const [sdk] = useState(() => {
    const transport = new WebBleTransport();
    return new Sdk(transport);
  });

  return (
    <>
      <button onClick={() => console.log(sdk.helloWorld())}>
        sdk.helloWorld()
      </button>
      <button
        onClick={async () => {
          const [device] = await firstValueFrom(sdk.getDevices());
          console.log('Discovered devices:', device);
          const connectedDevice = await sdk.connectToDevice(device.id, () => {
            console.log(`Device ${device.id} disconnected`);
          });
          const helloCommand = new GetHelloHarvardCommand();
          const response = await sdk.sendCommand(connectedDevice, helloCommand);
          console.log('Response from GetHelloHarvardCommand:', response);
          alert(`Response: ${response}`);
        }}
      >
        sdk.getDevices()
      </button>
    </>
  );
}

export default App;
