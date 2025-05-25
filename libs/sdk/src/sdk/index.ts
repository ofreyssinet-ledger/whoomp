import { type Transport } from '../transport';

export class Sdk {
  transport: Transport;

  constructor(transport: Transport) {
    console.log('SDK: Initialized with transport', transport);
    this.transport = transport;
  }

  helloWorld() {
    console.log('SDK: helloWorld called');
    return this.transport.helloWorld();
  }
}
