import {
  type ConnectedDevice as SDKConnectedDevice,
  DeviceState,
  DeviceSessionState,
} from '@whoomp/sdk';
import {throttleTime} from 'rxjs';
import {useStateFromObservable} from './useStateFromObservable';

export function useDeviceState(
  connectedDevice: SDKConnectedDevice,
): DeviceState | null {
  return useStateFromObservable(connectedDevice.deviceStateObservable);
}

export function useDeviceSessionState(
  connectedDevice: SDKConnectedDevice,
): DeviceSessionState | null {
  return useStateFromObservable(connectedDevice.deviceSessionState);
}

export function useHeartRate(
  connectedDevice: SDKConnectedDevice,
): number | null {
  const heartRateEvents = useStateFromObservable(
    connectedDevice.heartRateFromStrapObservable,
  );
  if (!heartRateEvents || heartRateEvents.length === 0) {
    return null;
  }
  // Return the most recent heart rate event's BPM
  const lastEvent = heartRateEvents[heartRateEvents.length - 1];
  return lastEvent.bpm;
}

export function useMostRecentHistoricalData(
  connectedDevice: SDKConnectedDevice,
  /**
   * Throttle time in milliseconds for historical data updates.
   * Use at least 1000ms to avoid overwhelming the UI.
   */
  throttleTimeMs: number = 1000,
) {
  return useStateFromObservable(
    connectedDevice.mostRecentHistoricalDataPacket.pipe(
      throttleTime(throttleTimeMs),
    ),
  );
}
