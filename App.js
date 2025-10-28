import React, { useState, useEffect, useRef } from "react";
import {
  StatusBar,
  AppState,
  StyleSheet,
  Animated,
  View,
  Image,
  Text,
} from "react-native";
import "@/global.css";
import { Alert } from "react-native";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { config } from "@/gluestack-ui.config";
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
import { auth, db, rtdb } from "./config/firebase-config";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { ref, set, onDisconnect, onValue } from "firebase/database";
import { doc, onSnapshot } from "firebase/firestore";
import { MealUpdateProvider } from "./components/context/MealUpdateContext";
import MealDetailScreen from "./components/screens/Home/Meals/MealDetailScreen";
import SelectionLocationScreen from "./components/screens/Home/Meals/SelectLocationScreen";
import PaymentMethodScreen from "./components/screens/Home/Meals/PaymentMethodScreen";
import ConfirmOrderScreen from "./components/screens/Home/Meals/ConfirmOrderScreen";
import LostStreakScreen from "./components/screens/Home/LostStreakScreen";
import CartScreen from "./components/screens/Home/Meals/CartScreen";
import TrackOrderScreen from "./components/screens/Home/Meals/TrackOrderScreen";
import AccountScreen from "./components/screens/Home/Menus/AccountScreen";
import SettingsScreen from "./components/screens/Home/Menus/SettingsScreen";
import * as Notifications from "expo-notifications";
import { CartProvider } from "./components/context/CartContext";
import AccountOwnership from "./components/screens/AccountOwnerShip/AccountOwnership";
import FavoriteScreen from "./components/screens/Home/Meals/FavoriteScreen";
import NotificationsScreen from "./components/screens/Home/Notifications/NotificationScreen";
import { registerForPushNotificationsAsync, scheduleNutriFitReminders } from "./components/utils/notifications";
import * as SplashScreen from 'expo-splash-screen';
import GcashPaymentScreen from "./components/screens/Home/Meals/GcashPaymentScreen";
import { NotificationsProvider, useNotifications } from "./components/context/NotificationsContext";
import HelpScreen from "./components/screens/HelpCenter/Help";
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, 
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const Stack = createNativeStackNavigator();
// SplashScreen.hide(); // Removed

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  // Splash animation refs
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const partnershipOpacity = useRef(new Animated.Value(0)).current;
  const partnershipTranslateY = useRef(new Animated.Value(20)).current;

  // Listen for auth state changes
  useEffect(() => {
    let unsubscribeUser = null;
    let alertShown = false; // prevent repeated alerts

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthChecked(true);

      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        unsubscribeUser = onSnapshot(userRef, async (docSnap) => {
          if (!docSnap.exists()) return;
          const data = docSnap.data();

          if ((data.status === "blocked" || data.status === "deactivated") && !alertShown) {
            alertShown = true; // mark so it won’t show again
            
            const title =
              data.status === "blocked" ? "Account Blocked" : "Account Deactivated";
            const message =
              data.status === "blocked"
                ? "Your account has been blocked. You will now be logged out."
                : "Your account has been deactivated. You will now be logged out.";

            Alert.alert(
              title,
              message,
              [
                {
                  text: "OK",
                  onPress: async () => {
                    try {
                      await signOut(auth);
                    } catch (err) {
                      console.error(err);
                    }
                  },
                },
              ],
              { cancelable: false }
            );
          }
        });
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);


  // Notifications setup
  useEffect(() => {
    let receivedListener, responseListener;

    (async () => {
      try {
        await registerForPushNotificationsAsync();
        await scheduleNutriFitReminders();
      } catch (err) {
        console.error("Notifications error:", err);
      }

      receivedListener = Notifications.addNotificationReceivedListener((notification) => {
        console.log("Notification received:", notification);
      });

      responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("Notification tapped:", response);
      });
    })();

    return () => {
      if (receivedListener) receivedListener.remove();
      if (responseListener) responseListener.remove();
    };
  }, []);

// Splash animations
useEffect(() => {
  // Animate logo
  Animated.parallel([
    Animated.timing(scaleAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
    Animated.timing(logoOpacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
  ]).start();

  // Animate partnership fade-in after 1.2s
  const partnershipTimer = setTimeout(() => {
    Animated.parallel([
      Animated.timing(partnershipOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(partnershipTranslateY, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, 1200);

  // Fade out splash (both logo and partnership) after 3.5s
  const fadeTimer = setTimeout(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.timing(partnershipOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start(async () => {
      await SplashScreen.hideAsync();
      setSplashDone(true);
    });
  }, 3500);

  return () => {
    clearTimeout(partnershipTimer);
    clearTimeout(fadeTimer);
  };
}, []);


return (
  <>
    {!splashDone && (
      <View style={styles.splashContainer}>
        {/* Logo centered vertically */}
        <View style={styles.logoWrapper}>
          <Animated.Image
            source={require('./assets/NutriFitLogo.png')}
            style={{
              width: 200,
              height: 200,
              opacity: fadeAnim, 
              transform: [{ scale: scaleAnim }], 
            }}
            resizeMode="contain"
          />
        </View>

        {/* Partnership at bottom */}
        <Animated.View
          style={[
            styles.partnershipContainer,
            {
              opacity: partnershipOpacity,
              transform: [{ translateY: partnershipTranslateY }],
            },
          ]}
        >
          <Text style={styles.partnerText}>In Partnership With</Text>
          <Image
            source={require('./assets/WeDietLogo.jpg')}
            style={styles.partnerLogo}
            resizeMode="contain"
          />
        </Animated.View>

      </View>
    )}

    {splashDone && authChecked && (
      <GluestackUIProvider config={config}>
        <NotificationsProvider>
          <StatusBar style="auto" />
          <MealUpdateProvider>
            <CartProvider>
              <AuthListenerWrapper setUser={setUser}>
                <NavigationContainer>
                  <Stack.Navigator screenOptions={{ headerShown: false }}>
                    {!user ? (
                      <>
                        <Stack.Screen name="Login" component={LoginScreen} />
                        <Stack.Screen name="GetStarted" component={GetStarted} />
                        <Stack.Screen name="SignUpWithEmail" component={SignUpWithEmail} />
                      </>
                    ) : (
                      <>
                        <Stack.Screen name="MainTabs" component={MainTabs} />
                        <Stack.Screen name="Landing" component={LandingScreen} />
                        <Stack.Screen
                          name="NotificationsScreen"
                          component={NotificationsScreen}
                          options={{ animation: "slide_from_bottom" }}
                        />
                        <Stack.Screen name="Order" component={OrderScreen} />
                        <Stack.Screen name="MealDetail" component={MealDetailScreen} />
                        <Stack.Screen name="PaymentMethod" component={PaymentMethodScreen} />
                        <Stack.Screen name="GcashPayment" component={GcashPaymentScreen} />
                        <Stack.Screen name="Meals" component={MealsScreen} />
                        <Stack.Screen name="LostStreakScreen" component={LostStreakScreen} />
                        <Stack.Screen name="CartScreen" component={CartScreen} />
                        <Stack.Screen name="SelectLocationScreen" component={SelectionLocationScreen} />
                        <Stack.Screen name="ConfirmOrder" component={ConfirmOrderScreen} />
                        <Stack.Screen name="TrackOrderScreen" component={TrackOrderScreen} />
                        <Stack.Screen name="FavoriteScreen" component={FavoriteScreen} />
                        <Stack.Screen name="Account" component={AccountScreen} />
                        <Stack.Screen name="Help" component={HelpScreen} />
                        <Stack.Screen name="Settings" component={SettingsScreen} />
                        <Stack.Screen name="AccountOwnership" component={AccountOwnership} />

                        <Stack.Group screenOptions={{ presentation: "modal" }}>
                          <Stack.Screen
                            name="LogFoodModal"
                            component={LogFoodModal}
                            options={{ title: "Log New Food" }}
                          />
                        </Stack.Group>
                      </>
                    )}
                  </Stack.Navigator>
                </NavigationContainer>
              </AuthListenerWrapper>
            </CartProvider>
          </MealUpdateProvider>
        </NotificationsProvider>
      </GluestackUIProvider>
    )}
  </>
);


}


function AuthListenerWrapper({ children, setUser }) {
  const { addNotification } = useNotifications();
  const appStateListener = useRef(null);
  const notifiedOrders = useRef({});
  const unsubscribeOrdersRef = useRef(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      // Cleanup when user logs out
      if (!currentUser) {
        if (appStateListener.current) {
          appStateListener.current.remove();
          appStateListener.current = null;
        }
        if (unsubscribeOrdersRef.current) {
          unsubscribeOrdersRef.current();
          unsubscribeOrdersRef.current = null;
        }
        return;
      }

      // ✅ Presence tracking (Realtime Database)
      const presenceRef = ref(rtdb, `/availability/${currentUser.uid}`);
      const connectedRef = ref(rtdb, ".info/connected");

      onValue(connectedRef, (snapshot) => {
        if (snapshot.val() === true) {
          set(presenceRef, { state: "online", lastChanged: Date.now() });
          onDisconnect(presenceRef).set({
            state: "offline",
            lastChanged: Date.now(),
          });
        }
      });

      if (!appStateListener.current) {
        appStateListener.current = AppState.addEventListener(
          "change",
          (nextAppState) => {
            set(presenceRef, {
              state: nextAppState === "active" ? "online" : "offline",
              lastChanged: Date.now(),
            });
          }
        );
      }

      // ✅ Clean old listeners before attaching new ones
      if (unsubscribeOrdersRef.current) unsubscribeOrdersRef.current();

      // ✅ Firestore listener for orders collection
      const userOrdersRef = doc(db, "orders", currentUser.uid);
      unsubscribeOrdersRef.current = onSnapshot(userOrdersRef, async (docSnap) => {
        if (!docSnap.exists()) return;

        const orderData = docSnap.data();
        if (!orderData?.status) return;

        const orderId = docSnap.id;
        const normalizedStatus = orderData.status.toLowerCase();

        // Reset if done
        if (normalizedStatus === "done") {
          delete notifiedOrders.current[orderId];
          return;
        }

        if (notifiedOrders.current[orderId] === normalizedStatus) return;
        notifiedOrders.current[orderId] = normalizedStatus;

        let title = "";
        let body = "";
        switch (normalizedStatus) {
          case "received":
            title = "Order Confirmed";
            body = "We’ve received your order and it’s now being processed.";
            break;
          case "preparing":
            title = "Preparing Your Order";
            body = "Our team is carefully preparing your meal to ensure freshness and quality.";
            break;
          case "out for delivery":
            title = "Ready for Pickup";
            body = "Your order is ready and waiting for the rider to pick up.";
            break;
          case "picked up":
            title = "Rider Has Your Order";
            body = "The delivery rider has picked up your order and is on the way.";
            break;
          case "on the way":
            title = "On the Way";
            body = "Your rider is heading to your location with your order.";
            break;
          case "done":
            title = "Delivered";
            body = "Your order has been delivered successfully. We hope you enjoy your meal!";
            break;
          default:
            return;
        }

        // 🔔 Local push notification
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: { screen: "TrackOrderScreen", orderId },
            sound: "default",
          },
          trigger: { seconds: 1 },
        });

        // In-app notifications
        addNotification({
          title,
          message: body,
          icon: "notifications-outline",
          orderId,
          timestamp: Date.now(),
        });
      });

    });

    return () => {
      unsubscribeAuth();
      if (appStateListener.current) appStateListener.current.remove();
      if (unsubscribeOrdersRef.current) unsubscribeOrdersRef.current();
    };
  }, []);

  return <>{children}</>;
}




const styles = StyleSheet.create({
splashContainer: {
  flex: 1,
  justifyContent: "space-between", // pushes logo to center and partnership to bottom
  alignItems: "center",
  paddingVertical: 60, // optional spacing from top/bottom
  backgroundColor:"#FFFFFF"
},
logoWrapper: {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
},
partnershipContainer: {
  alignItems: "center",
},
partnerText: {
  fontSize: 14,
  color: "#6b7280",
  marginBottom: 8,
},
partnerLogo: {
  width: 80,
  height: 80,
},
});
