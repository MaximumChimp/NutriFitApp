import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';

export default function ShowStreakAnimation({ count = 1, onFinish }) {
  return (
    <View style={styles.container}>
      <LottieView
        source={require('../../../assets/animations/streak.json')}
        autoPlay
        loop={false}
        onAnimationFinish={onFinish}
        style={styles.animation}
      />
      <Text style={styles.text}>{count} Day Streak!🔥</Text>
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width,
    height,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  animation: {
    width: 200,
    height: 200,
  },
  text: {
    marginTop: 12,
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
  },
});
