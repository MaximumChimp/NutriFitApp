// utils/notifications.js
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
// Helper: pick message in rotation based on weekday
function pickRotating(messages) {
  const dayIndex = new Date().getDay(); // 0=Sun ... 6=Sat
  return messages[dayIndex % messages.length];
}

export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.log("⚠️ Must use a physical device for notifications");
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("🚫 Notification permission not granted");
    return;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#14532d",
    });
    console.log("✅ Android notification channel set");
  }

  console.log("✅ Local notifications ready (no push token needed)");
}

export async function scheduleNutriFitReminders() {
  console.log("⏳ Clearing all scheduled notifications...");
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Get user profile from local storage
  let firstName = "";
  try {
    const userProfileJson = await AsyncStorage.getItem("userProfile");
    if (userProfileJson) {
      const userProfile = JSON.parse(userProfileJson);
      firstName = userProfile.firstName || "";
    }
  } catch (err) {
    console.error("Error fetching user profile:", err);
  }

  // Helper to inject firstName
  const withName = (msg) => ({
    title: msg.title,
    body: firstName ? `${firstName}, ${msg.body}` : msg.body,
  });

  // Morning: 7 AM
  const morningMessages = [
    { title: "Good morning!", body: "Have you had some water yet? Don’t forget to log your breakfast." },
    { title: "Morning check-in", body: "Hey, rise and shine! Did you have breakfast yet? Make sure to track it." },
    { title: "Start your day", body: "How about starting strong. Drink some water and log your first meal?" },
  ];
  await Notifications.scheduleNotificationAsync({
    content: { ...withName(pickRotating(morningMessages)), sound: "default" },
    trigger: { hour: 7, minute: 0, repeats: true, type: "daily" },
  });

  // Afternoon: 12 PM
  const lunchMessages = [
    { title: "Lunch time!", body: "Have you had your lunch? Don’t forget to log it." },
    { title: "Midday check-in", body: "Pause for a moment. Did you eat lunch yet? Track it to stay on point." },
    { title: "Lunch reminder", body: "Time for a quick check: have you logged your lunch today?" },
  ];
  await Notifications.scheduleNotificationAsync({
    content: { ...withName(pickRotating(lunchMessages)), sound: "default" },
    trigger: { hour: 12, minute: 0, repeats: true, type: "daily" },
  });

  // Evening: 7 PM
  const eveningMessages = [
    { title: "Evening check-in", body: "Have you had dinner yet? Log your meal and any activity for today." },
    { title: "Dinner time", body: "Did you wrap up your dinner? Don’t forget to track it and your workouts." },
    { title: "Almost done with the day", body: "Have you recorded your evening meal and workout yet?" },
  ];
  await Notifications.scheduleNotificationAsync({
    content: { ...withName(pickRotating(eveningMessages)), sound: "default" },
    trigger: { hour: 19, minute: 0, repeats: true, type: "daily" },
  });

  // Nightly: 10 PM
  const nightlyMessages = [
    { title: "Nightly check-in", body: "Did you log everything you ate today? Take a moment to review." },
    { title: "Before bed", body: "Have you tracked today’s meals and activity? Let’s finish strong." },
    { title: "End of day", body: "Almost bedtime did you record all your meals and workouts?" },
  ];
  await Notifications.scheduleNotificationAsync({
    content: { ...withName(pickRotating(nightlyMessages)), sound: "default" },
    trigger: { hour: 22, minute: 0, repeats: true, type: "daily" },
  });

  // Weekly: Sunday 8 PM
  const weeklyMessages = [
    { title: "Weekly review", body: "How was your week? Take a moment to review meals and workouts." },
    { title: "Sunday check-in", body: "Did you track everything this week? Celebrate what you accomplished." },
    { title: "Week wrap-up", body: "Look back at your week. What went well and what can you improve next week?" },
  ];
  await Notifications.scheduleNotificationAsync({
    content: { ...withName(pickRotating(weeklyMessages)), sound: "default" },
    trigger: {
      weekday: 1, // Sunday
      hour: 20,
      minute: 0,
      repeats: true,
      type: "weekly",
    },
  });

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  console.log("✅ Notifications scheduled:", scheduled.length);
}
