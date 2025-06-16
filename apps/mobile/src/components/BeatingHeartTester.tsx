import Slider from '@react-native-community/slider';
import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import BeatingHeart from '../components/BeatingHeart';
import {useDisplayedConnectedDeviceThrowIfNull} from '../context/DisplayedConnectedDeviceContext';
import {useHeartRate} from '../hooks/connectedDeviceHooks';

const BeatingHeartTester = () => {
  const connectedDevice = useDisplayedConnectedDeviceThrowIfNull();
  const heartRate = useHeartRate(connectedDevice);
  const [bpm, setBpm] = useState(60);

  return (
    <View style={styles.container}>
      <BeatingHeart bpm={bpm} size={100} color="#e0245e" />

      <View style={styles.sliderContainer}>
        <Text style={styles.label}>BPM: {Math.round(bpm)}</Text>
        <Slider
          style={styles.slider}
          minimumValue={40}
          maximumValue={200}
          step={1}
          value={bpm}
          minimumTrackTintColor="#e0245e"
          maximumTrackTintColor="#ccc"
          thumbTintColor="#e0245e"
          onValueChange={setBpm}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sliderContainer: {
    width: '100%',
    marginTop: 40,
  },
  label: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  slider: {
    width: '100%',
    height: 40,
  },
});
