import { type Transport } from '@whoomp/sdk';

const WebBleTransport: Transport = {
  helloWorld: () => {
    console.log('Hello from Web BLE Transport');
    return 'Hello from Web BLE Transport';
  },
};

export { WebBleTransport };
