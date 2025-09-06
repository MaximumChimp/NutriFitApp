import React, { useEffect, useRef } from 'react';
import { View, Image, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const SplashScreen = ({ navigation }) => {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const badgeTranslateY = useRef(new Animated.Value(20)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current; // for overall fade out

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

    // Fade out after 4 seconds
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start(() => {
        // Navigate to main app screen here
        // Example: navigation.replace('Home');
      });
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <LinearGradient
        colors={['#d4fc79', '#96e6a1']}
        start={{ x: 0.0, y: 0.2 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <View style={styles.center}>
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
        </View>

        <Animated.View
          style={{
            opacity: badgeOpacity,
            transform: [{ translateY: badgeTranslateY }],
            alignItems: 'center',
            marginBottom: 48,
          }}
        >
          <Image
            source={require('../../../assets/WeDietLogo.jpg')}
            style={{ width: 60, height: 60 }}
            resizeMode="contain"
          />
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', alignItems: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default SplashScreen;
