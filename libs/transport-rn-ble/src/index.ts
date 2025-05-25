import { type Transport } from '@whoomp/sdk';

const RNBleTransport: Transport = {
  helloWorld: () => {
    console.log('Hello from RN BLE Transport');
    return 'Hello from RN BLE Transport';
  },
};

export { RNBleTransport };
