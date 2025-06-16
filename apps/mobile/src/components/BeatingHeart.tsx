import React, {useEffect} from 'react';
import {View, StyleSheet, Text} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  cancelAnimation,
  Easing,
  runOnUI,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

const BeatingHeart = ({bpm = 60, size = 60, color = 'red'}) => {
  const interval = useSharedValue(60000 / bpm);
  const progress = useSharedValue(0);

  useEffect(() => {
    interval.value = 60000 / bpm;
  }, [bpm]);

  useEffect(() => {
    runOnUI(() => {
      'worklet';
      const loop = () => {
        progress.value = withTiming(
          1,
          {duration: interval.value, easing: Easing.linear},
          finished => {
            if (finished) {
              progress.value = 0;
              loop();
            }
          },
        );
      };
      cancelAnimation(progress);
      loop();
    })();
  }, []);

  const heartStyle = useAnimatedStyle(() => {
    const t = progress.value;

    // Fixed phase durations in ms
    const compressMs = 180;
    const expandMs = 180;
    const totalMs = interval.value;

    const compressEnd = compressMs / totalMs;
    const expandEnd = (compressMs + expandMs) / totalMs;

    let scaleValue = 1;
    if (t < compressEnd) {
      scaleValue = interpolate(
        t,
        [0, compressEnd],
        [1, 0.9],
        Extrapolation.CLAMP,
      );
    } else if (t < expandEnd) {
      scaleValue = interpolate(
        t,
        [compressEnd, expandEnd],
        [0.9, 1.1],
        Extrapolation.CLAMP,
      );
    } else {
      scaleValue = interpolate(
        t,
        [expandEnd, 1],
        [1.1, 1],
        Extrapolation.CLAMP,
      );
    }
    return {transform: [{scale: scaleValue}], bottom: size / 10};
  });

  const waveStyle = useAnimatedStyle(() => {
    const t = progress.value;

    const compressMs = 180;
    const expandMs = 180;
    const totalMs = interval.value;
    const activeMs = 1 * compressMs + expandMs;
    const activeEnd = activeMs / totalMs;

    let waveScale = 0;
    let opacity = 0;
    if (t < activeEnd) {
      waveScale = interpolate(t, [0, activeEnd], [0, 2], Extrapolation.CLAMP);
      opacity = interpolate(t, [0, activeEnd], [0.4, 0], Extrapolation.CLAMP);
    }
    return {
      position: 'absolute',
      top: -size / 14,
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: color,
      transform: [{scale: waveScale}],
      opacity,
    };
  });

  return (
    <View style={[styles.container, {width: size, height: size}]}>
      <Animated.View style={waveStyle} />
      <Animated.Text
        style={[styles.heart, heartStyle, {fontSize: size, color}]}>
        ♥
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  heart: {textAlign: 'center'},
});

export default BeatingHeart;
