import React, { useEffect, useRef, useState } from 'react';
import { View, Image, Text, Animated,Modal, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Updates from 'expo-updates';

const SplashScreen = () => {
  
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const badgeTranslateY = useRef(new Animated.Value(20)).current;

  const progressAnim = useRef(new Animated.Value(0)).current;
  const [progress, setProgress] = useState(0);
  const [updateAvailable, setUpdateAvailable] = useState(false);

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

  // OTA update check
  const checkForOTAUpdate = async () => {
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        setUpdateAvailable(true); // Show the modal
      }
    } catch (e) {
      console.log('Update check failed:', e);
    }
  };
  checkForOTAUpdate();

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
    <>
    <Modal
  transparent
  animationType="fade"
  visible={updateAvailable}
  onRequestClose={() => {}}
>
  <View className="flex-1 bg-black/60 justify-center items-center px-6">
    <View className="bg-white p-6 rounded-2xl w-full max-w-md">
      <Text className="text-lg font-bold mb-2 text-center">
        Update Available
      </Text>
      <Text className="text-gray-600 text-center mb-4">
        A new version of the app is available. Would you like to update now?
      </Text>

      <View className="flex-row justify-around mt-2">
        <Pressable
          onPress={() => setUpdateAvailable(false)}
          className="bg-gray-300 px-4 py-2 rounded-xl"
        >
          <Text className="text-gray-800 font-semibold">Later</Text>
        </Pressable>
        <Pressable
          onPress={async () => {
            try {
              await Updates.fetchUpdateAsync();
              await Updates.reloadAsync();
            } catch (e) {
              console.log('Update failed', e);
            }
          }}
          className="bg-green-600 px-4 py-2 rounded-xl"
        >
          <Text className="text-white font-semibold">Update</Text>
        </Pressable>
      </View>
    </View>
  </View>
</Modal>

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
        className="w-full items-center pb-28"
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
    </>
  );
};

export default SplashScreen;
