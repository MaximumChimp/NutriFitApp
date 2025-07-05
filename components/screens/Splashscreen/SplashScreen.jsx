import React, { useEffect, useRef, useState } from 'react';
import { View, Image, Text, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const SplashScreen = () => {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const badgeTranslateY = useRef(new Animated.Value(20)).current;

  const progressAnim = useRef(new Animated.Value(0)).current;
  const [progress, setProgress] = useState(0);

  const messages = [
    'Initializing...',
    'Connecting to server...',
    'Downloading content...',
    'Almost done...',
  ];
  const [statusMsg, setStatusMsg] = useState(messages[0]);

  useEffect(() => {
    // Logo animation
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    // Partnership badge animation
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(badgeOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(badgeTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1200);

    // Progress simulation
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      setProgress(current);
      progressAnim.setValue(current);
      if (current >= 100) clearInterval(interval);
    }, 30);

    // Rotate status messages
    const msgInterval = setInterval(() => {
      setStatusMsg((prev) => {
        const nextIndex = (messages.indexOf(prev) + 1) % messages.length;
        return messages[nextIndex];
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(msgInterval);
    };
  }, []);

  return (
    <LinearGradient
      colors={['#d4fc79', '#96e6a1']}
      className="flex-1 justify-between items-center"
      start={{ x: 0.0, y: 0.2 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Centered Logo + Progress */}
      <View className="flex-1 justify-center items-center">
        <Animated.View
          style={{
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          }}
        >
          <Image
            source={require('../../../assets/android/NutriFitLogo.png')}
            alt="NutriFit Logo"
            style={{ width: 150, height: 150 }}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Progress bar */}
        <View className="mt-6 w-64 h-3 bg-white/30 rounded-full overflow-hidden">
          <Animated.View
            style={{
              width: progressAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
              height: '100%',
              backgroundColor: '#14532d',
              borderRadius: 999,
            }}
          />
        </View>

        {/* Loading text */}
        <Text className="mt-2 text-white font-medium text-sm">
          {statusMsg} {progress}%
        </Text>
      </View>

      {/* Bottom Partnership Section */}
      <Animated.View
        className="w-full items-center pb-6"
        style={{
          opacity: badgeOpacity,
          transform: [{ translateY: badgeTranslateY }],
        }}
      >
        <View className="items-center">
          <Text className="text-white font-semibold text-sm mb-2">
            In partnership with
          </Text>
          <Image
            source={require('../../../assets/WeDietLogo.jpg')}
            alt="WeDiet Logo"
            style={{ width: 60, height: 60 }}
            resizeMode="contain"
          />
        </View>
      </Animated.View>
    </LinearGradient>
  );
};

export default SplashScreen;
