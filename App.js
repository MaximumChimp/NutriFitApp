import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import "@/global.css";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { config } from "@/gluestack-ui.config";
import { StyleSheet } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen from './components/screens/Splashscreen/SplashScreen';
import LandingScreen from './components/screens/LandingPage/LandingPage';
import GetStarted from './components/screens/GetStarted/OnboardingScreen';
import SignUpWithEmail from './components/screens/GetStarted/SignUpWithEmail';
import LoginScreen from './components/screens/GetStarted/Login';
import HomeScreen from './components/screens/Home/HomeScreen';
import ProfileScreen from './components/screens/Home/ProfileScreen';
import MainTabs from './components/navigation/MainTabs';
import LogFoodModal from './components/screens/Home/Log/LogFoodModal';
import MealsScreen from './components/screens/Home/MealsScreen';
import * as SplashScreenNative from 'expo-splash-screen';
import { auth } from './config/firebase-config';
import { onAuthStateChanged } from 'firebase/auth';



const Stack = createNativeStackNavigator();

// Keep splash visible while we fetch resources
SplashScreenNative.preventAutoHideAsync().catch(() => {
  /* ignore if already prevented */
});

export default function App() {
  const [splashVisible, setSplashVisible] = useState(true);
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    let unsubscribe;

    const checkAuthState = async () => {
      const hasLaunched = await AsyncStorage.getItem('hasLaunched');

      unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!hasLaunched) {
          await AsyncStorage.setItem('hasLaunched', 'true');
          setInitialRoute('Landing');
        } else if (!user) {
          setInitialRoute('Login');
        } else {
          setInitialRoute('MainTabs');
        }

        setSplashVisible(false);
      });
    };

    checkAuthState();

    return () => {
      if (unsubscribe) unsubscribe(); // cleanup
    };
  }, []);

  useEffect(() => {
    if (!splashVisible && initialRoute) {
      SplashScreenNative.hideAsync().catch(() => {});
    }
  }, [splashVisible, initialRoute]);

  if (splashVisible || !initialRoute) return <SplashScreen />;

  return (
    <GluestackUIProvider config={config}>
      <StatusBar style="auto" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
          <Stack.Screen name="Landing" component={LandingScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="GetStarted" component={GetStarted} />
          <Stack.Screen name="SignUpWithEmail" component={SignUpWithEmail} />
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Meals" component={MealsScreen} />
          <Stack.Group screenOptions={{ presentation: 'modal' }}>
            <Stack.Screen name="LogFoodModal" component={LogFoodModal} options={{ title: "Log New Food" }} />
          </Stack.Group>
        </Stack.Navigator>
      </NavigationContainer>
    </GluestackUIProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
