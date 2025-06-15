import {useToggleScanning} from '../context/ToggleScanningContext';
import {useScanningContext} from '../context/ScanningContext';

export function useScanDevices() {
  const {scanning, startScanning, stopScanning} = useToggleScanning();
  const {discoveredDevices, error} = useScanningContext();

  return {
    discoveredDevices,
    scanning,
    error,
    startScanning,
    stopScanning,
  };
}
