import {Text, View} from 'react-native';
import {AppStateProvider} from './context/AppStateProvider';
import {ConnectedDevicesProvider} from './context/ConnectedDevicesProvider';
import DBProvider from './context/DBProvider';
import {DisplayedConnectedDeviceProvider} from './context/DisplayedConnectedDeviceProvider';
import {SdkProvider} from './context/SdkProvider';
import {useDisplayedDevice} from './context/DisplayedDeviceContext';
import {DisplayedDeviceScreen} from './screens/DisplayedDeviceScreen';
import {ConnectionScreen} from './screens/ConnectionScreen';
import {ScanningProvider} from './context/ScanningProvider';
import {ConnectingProvider} from './context/ConnectingProvider';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {StorageProvider} from './context/StorageProvider';

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();
  const displayedDevice = useDisplayedDevice();

  return (
    <View
      style={{
        backgroundColor: '#fff',
        flex: 1,
        paddingTop: safeAreaInsets.top,
        paddingBottom: safeAreaInsets.bottom,
        paddingLeft: safeAreaInsets.left,
        paddingRight: safeAreaInsets.right,
      }}>
      {displayedDevice ? <DisplayedDeviceScreen /> : <ConnectionScreen />}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <DBProvider>
        <StorageProvider>
          <AppStateProvider>
            <SdkProvider>
              <ScanningProvider>
                <ConnectingProvider>
                  <ConnectedDevicesProvider>
                    <ConnectedDevicesProvider>
                      <DisplayedConnectedDeviceProvider>
                        <AppContent />
                      </DisplayedConnectedDeviceProvider>
                    </ConnectedDevicesProvider>
                  </ConnectedDevicesProvider>
                </ConnectingProvider>
              </ScanningProvider>
            </SdkProvider>
          </AppStateProvider>
        </StorageProvider>
      </DBProvider>
    </SafeAreaProvider>
  );
}
