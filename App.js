import React, { useState, useEffect, useRef } from "react";
import { StatusBar } from "expo-status-bar";
import "@/global.css";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { config } from "@/gluestack-ui.config";
import { StyleSheet, Animated, View, Image, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LandingScreen from "./components/screens/LandingPage/LandingPage";
import GetStarted from "./components/screens/GetStarted/OnboardingScreen";
import SignUpWithEmail from "./components/screens/GetStarted/SignUpWithEmail";
import LoginScreen from "./components/screens/GetStarted/Login";
import OrderScreen from "./components/screens/Home/Meals/OrderScreen";
import MainTabs from "./components/navigation/MainTabs";
import LogFoodModal from "./components/screens/Home/Log/LogFoodModal";
import MealsScreen from "./components/screens/Home/MealsScreen";
import * as SplashScreenNative from "expo-splash-screen";
import { auth } from "./config/firebase-config";
import { onAuthStateChanged } from "firebase/auth";
import { MealUpdateProvider } from "./components/context/MealUpdateContext";
import MealDetailScreen from "./components/screens/Home/Meals/MealDetailScreen";
import SelectionLocationScreen from "./components/screens/Home/Meals/SelectLocationScreen";
import PaymentMethodScreen from "./components/screens/Home/Meals/PaymentMethodScreen";
import ConfirmOrderScreen from "./components/screens/Home/Meals/ConfirmOrderScreen";
import LostStreakScreen from "./components/screens/Home/LostStreakScreen";
import Toast, { BaseToast } from "react-native-toast-message";
import CartScreen from "./components/screens/Home/Meals/CartScreen";
import TrackOrderScreen from "./components/screens/Home/Meals/TrackOrderScreen";
import * as Notifications from "expo-notifications";

const Stack = createNativeStackNavigator();

export default function App() {
  const [initialRoute, setInitialRoute] = useState(null);
  const [splashDone, setSplashDone] = useState(false);

  // Splash animation refs
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const badgeTranslateY = useRef(new Animated.Value(20)).current;

  // Keep native splash visible
  useEffect(() => {
    SplashScreenNative.preventAutoHideAsync();
  }, []);

  // Notifications handler
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  // Preload tasks: auth check, etc.
  useEffect(() => {
    const preloadApp = async () => {
      try {
        // Wait for auth state
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          if (!user) setInitialRoute("Login");
          else setInitialRoute("MainTabs");
          unsubscribe();
        });

        // Optional: add other tasks here (e.g., fetch user settings, TDEE, remote configs)
        // await fetchUserSettings();

      } catch (err) {
        console.log("Preload error:", err);
        setInitialRoute("Login"); // fallback
      }
    };

    preloadApp();
  }, []);

  // Splash logo animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

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
  }, []);
  
  // Fade out splash when all tasks are done OR 4s elapsed
  useEffect(() => {
    if (initialRoute) {
      // Ensure splash stays at least 4 seconds
      const timer = setTimeout(async () => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }).start(async () => {
          await SplashScreenNative.hideAsync();
          setSplashDone(true);
        });
      }, 4000); // 4000ms = 4 seconds

      return () => clearTimeout(timer);
    }
  }, [initialRoute]);


  // Show splash until done
  if (!initialRoute || !splashDone) {
    return (
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <LinearGradient
          colors={["#d4fc79", "#96e6a1"]}
          start={{ x: 0.0, y: 0.2 }}
          end={{ x: 1, y: 1 }}
          style={styles.splashContainer}
        >
          <View style={styles.center}>
            <Animated.Image
              source={require("./assets/android/NutriFitLogo.png")}
              style={{
                width: 150,
                height: 150,
                transform: [{ scale: scaleAnim }],
                opacity: logoOpacity,
              }}
              resizeMode="contain"
            />
          </View>

          <Animated.View
            style={{
              opacity: badgeOpacity,
              transform: [{ translateY: badgeTranslateY }],
              alignItems: "center",
              marginBottom: 48,
            }}
          >
            <Text
              style={{ color: "#fff", fontWeight: "600", marginBottom: 8 }}
            >
              In partnership with
            </Text>
            <Image
              source={require("./assets/WeDietLogo.jpg")}
              style={{ width: 60, height: 60 }}
              resizeMode="contain"
            />
          </Animated.View>
        </LinearGradient>
      </Animated.View>
    );
  }

  // Toast configuration
  const toastConfig = {
    success: (props) => (
      <BaseToast
        {...props}
        style={{
          borderLeftColor: "#22c55e",
          alignSelf: "flex-start",
          marginLeft: 20,
          marginRight: "auto",
          borderRadius: 10,
        }}
        text1Style={{ fontSize: 14, fontWeight: "bold" }}
        text2Style={{ fontSize: 12 }}
      />
    ),
  };

  return (
    <GluestackUIProvider config={config}>
      <StatusBar style="auto" />
      <MealUpdateProvider>
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{ headerShown: false }}
            initialRouteName={initialRoute}
          >
            <Stack.Screen name="Landing" component={LandingScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="GetStarted" component={GetStarted} />
            <Stack.Screen name="SignUpWithEmail" component={SignUpWithEmail} />
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="Order" component={OrderScreen} />
            <Stack.Screen name="MealDetail" component={MealDetailScreen} />
            <Stack.Screen
              name="PaymentMethod"
              component={PaymentMethodScreen}
            />
            <Stack.Screen name="Meals" component={MealsScreen} />
            <Stack.Screen name="LostStreakScreen" component={LostStreakScreen} />
            <Stack.Screen name="CartScreen" component={CartScreen} />
            <Stack.Screen name="SelectLocationScreen" component={SelectionLocationScreen}/>
            <Stack.Screen
              name="ConfirmOrder"
              component={ConfirmOrderScreen}
              options={{ title: "Confirm Order" }}
            />
            <Stack.Screen name="TrackOrderScreen" component={TrackOrderScreen}/>
            <Stack.Group screenOptions={{ presentation: "modal" }}>
              <Stack.Screen
                name="LogFoodModal"
                component={LogFoodModal}
                options={{ title: "Log New Food" }}
              />
            </Stack.Group>
          </Stack.Navigator>
          <Toast config={toastConfig} />
        </NavigationContainer>
      </MealUpdateProvider>
    </GluestackUIProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
