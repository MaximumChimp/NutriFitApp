import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import "@/global.css";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { config } from "@/gluestack-ui.config";
import { StyleSheet } from 'react-native';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen from './components/screens/Splashscreen/SplashScreen';
import Login from './components/screens/LandingPage/LandingPage';
import GetStarted from './components/screens/GetStarted/OnboardingScreen'; // renamed correctly
import SignUpWithEmail from './components/screens/GetStarted/SignUpWithEmail';

const Stack = createNativeStackNavigator();

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <GluestackUIProvider config={config}>
      <StatusBar style="auto" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {showSplash ? (
            <Stack.Screen name="Splash" component={SplashScreen} />
          ) : (
            <>
              <Stack.Screen name="Login" component={Login} />
              <Stack.Screen name="GetStarted" component={GetStarted} />
             <Stack.Screen
              name="SignUpWithEmail"
              component={SignUpWithEmail}
              options={{
                animation: 'fade_from_bottom',
                presentation: 'modal', // Makes it feel like a smooth popup
                gestureEnabled: true,  // Allow swipe to close on iOS
                headerShown: false     // Optional: hide header for cleaner look
              }}
            />

            </>
          )}
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
