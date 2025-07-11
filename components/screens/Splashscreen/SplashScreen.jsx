import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Image,
  Text,
  Animated,
  Modal,
  Pressable,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Updates from 'expo-updates';
import NetInfo from '@react-native-community/netinfo';

const SplashScreen = () => {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const badgeTranslateY = useRef(new Animated.Value(20)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const [progress, setProgress] = useState(0);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Initializing...');

  const messages = [
    'Initializing...',
    'Connecting to server...',
    'Downloading content...',
    'Almost done...',
  ];

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

    // OTA Update check only if online
    const checkOTAUpdateIfOnline = async () => {
      const state = await NetInfo.fetch();
      if (state.isConnected) {
        try {
          const update = await Updates.checkForUpdateAsync();
          if (update.isAvailable) {
            setUpdateAvailable(true);
          }
        } catch (e) {
          console.log('OTA check failed:', e);
        }
      }
    };
    checkOTAUpdateIfOnline();

    // Accurate progress loader
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      if (current > 100) {
        current = 100;
        clearInterval(interval);
      }
      setProgress(current);
      progressAnim.setValue(current);
    }, 30);

    // Rotating status messages
    const msgInterval = setInterval(() => {
      setStatusMsg(prev => {
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
      {/* Modal for OTA update */}
      <Modal transparent visible={updateAvailable} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Update Available</Text>
            <Text style={styles.modalText}>
              A new version of the app is available. Would you like to update now?
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.button, { backgroundColor: '#e5e7eb' }]}
                onPress={() => setUpdateAvailable(false)}
              >
                <Text style={{ color: '#1f2937' }}>Later</Text>
              </Pressable>
              <Pressable
                style={[styles.button, { backgroundColor: '#22c55e' }]}
                onPress={async () => {
                  try {
                    await Updates.fetchUpdateAsync();
                    await Updates.reloadAsync();
                  } catch (e) {
                    console.log('Update failed', e);
                  }
                }}
              >
                <Text style={{ color: '#fff' }}>Update</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <LinearGradient
        colors={['#d4fc79', '#96e6a1']}
        start={{ x: 0.0, y: 0.2 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, justifyContent: 'space-between', alignItems: 'center' }}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Animated.View
            style={{
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            }}
          >
            <Image
              source={require('../../../assets/android/NutriFitLogo.png')}
              style={{ width: 150, height: 150 }}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Progress Bar */}
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                    extrapolate: 'clamp',
                  }),
                },
              ]}
            />
          </View>

          {/* Status Message */}
          <Text style={styles.statusText}>
            {statusMsg} {Math.min(progress, 100)}%
          </Text>
        </View>

        {/* Partner Section */}
        <Animated.View
          style={{
            opacity: badgeOpacity,
            transform: [{ translateY: badgeTranslateY }],
            alignItems: 'center',
            marginBottom: 48,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '600', marginBottom: 8 }}>
            In partnership with
          </Text>
          <Image
            source={require('../../../assets/WeDietLogo.jpg')}
            style={{ width: 60, height: 60 }}
            resizeMode="contain"
          />
        </Animated.View>
      </LinearGradient>
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalBox: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalText: {
    textAlign: 'center',
    color: '#4b5563',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  progressBar: {
    marginTop: 24,
    width: 200,
    height: 6,
    backgroundColor: '#ffffff66',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#14532d',
  },
  statusText: {
    marginTop: 10,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default SplashScreen;
