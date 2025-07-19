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
import OrderScreen from './components/screens/Home/Meals/OrderScreen';
import MainTabs from './components/navigation/MainTabs';
import LogFoodModal from './components/screens/Home/Log/LogFoodModal';
import MealsScreen from './components/screens/Home/MealsScreen';
import * as SplashScreenNative from 'expo-splash-screen';
import { auth } from './config/firebase-config';
import { onAuthStateChanged } from 'firebase/auth';
import { MealUpdateProvider } from './components/context/MealUpdateContext';
import MealDetailScreen from './components/screens/Home/Meals/MealDetailScreen';
import SelectLocationScreen from './components/screens/Home/Meals/SelectLocationScreen';
import PaymentMethodScreen from './components/screens/Home/Meals/PaymentMethodScreen';
import ConfirmOrderScreen from './components/screens/Home/Meals/ConfirmOrderScreen';
import LostStreakScreen from './components/screens/Home/LostStreakScreen';
import Toast,{BaseToast} from 'react-native-toast-message';
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
  const toastConfig = {
    success: (props) => (
      <BaseToast
        {...props}
        style={{
          borderLeftColor: '#22c55e',
          alignSelf: 'flex-start',
          marginLeft: 20,
          marginRight: 'auto',
          borderRadius: 10,
        }}
        text1Style={{ fontSize: 14, fontWeight: 'bold' }}
        text2Style={{ fontSize: 12 }}
      />
    ),
  };
  return (
    <GluestackUIProvider config={config}>
      <StatusBar style="auto" />
      <MealUpdateProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
            <Stack.Screen name="Landing" component={LandingScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="GetStarted" component={GetStarted} />
            <Stack.Screen name="SignUpWithEmail" component={SignUpWithEmail} />
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="Order" component={OrderScreen} />
            <Stack.Screen name="MealDetail" component={MealDetailScreen} />
            <Stack.Screen name="SelectLocation" component={SelectLocationScreen} />
            <Stack.Screen name="PaymentMethod" component={PaymentMethodScreen} />
            <Stack.Screen name="Meals" component={MealsScreen} />
            <Stack.Screen name="LostStreakScreen" component={LostStreakScreen} />

            <Stack.Screen
              name="ConfirmOrder"
              component={ConfirmOrderScreen}
              options={{ title: 'Confirm Order' }}
            />
            <Stack.Group screenOptions={{ presentation: 'modal' }}>
              <Stack.Screen name="LogFoodModal" component={LogFoodModal} options={{ title: "Log New Food" }} />
            </Stack.Group>
          </Stack.Navigator>
            <Toast config={toastConfig} />
        </NavigationContainer>
      </MealUpdateProvider>
    </GluestackUIProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
