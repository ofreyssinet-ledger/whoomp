import { useState } from 'react'
import './App.css'
import { Sdk } from '@whoomp/sdk';
import { WebBleTransport } from '@whoomp/transport-web-ble';

function App() {
  const [sdk] = useState(() => {
    const transport = WebBleTransport;
    return new Sdk(transport);
  })

  return (
    <>
      <button onClick={() => sdk.helloWorld()}>
        sdk.helloWorld()
      </button>
    </>
  )
}

export default App
