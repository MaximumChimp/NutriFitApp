// components/screens/Home/LostStreakScreen.js
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';

export default function LostStreakScreen({ onFinish }) {
  useEffect(() => {
    // Fallback auto-dismiss after 4 seconds
    const timer = setTimeout(() => {
      if (onFinish) onFinish();
    }, 4000);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <LottieView
          source={require('../../../assets/animations/lostStreak.json')}
          autoPlay
          loop={false}
          onAnimationFinish={onFinish}
          style={styles.animation}
        />
        <Text style={styles.text}>You lost your streak!</Text>
      </View>
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    width,
    height,
    zIndex: 999, // Ensures it overlays other content
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  animation: {
    width: 240,
    height: 240,
  },
  text: {
    marginTop: 20,
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 22,
    textAlign: 'center',
  },
});
