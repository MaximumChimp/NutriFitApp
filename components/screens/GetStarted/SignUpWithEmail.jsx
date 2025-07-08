import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { auth, db } from "@/config/firebase-config";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

// Harris-Benedict TDEE calculator with weight adjustment
function calculateCalories(user) {
  const { gender, weight, height, birthday, activityLevel, targetWeightChange } = user;

  const birthDate = new Date(birthday);
  const age = new Date().getFullYear() - birthDate.getFullYear();

  const heightInCm = parseFloat(height);
  const weightInKg = parseFloat(weight);
  const weightChange = parseFloat(targetWeightChange || "0");

  let bmr = 0;
  if (gender === "male") {
    bmr = 88.362 + 13.397 * weightInKg + 4.799 * heightInCm - 5.677 * age;
  } else if (gender === "female") {
    bmr = 447.593 + 9.247 * weightInKg + 3.098 * heightInCm - 4.330 * age;
  }

  const activityFactors = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    veryActive: 1.9,
  };

  const activityFactor = activityFactors[activityLevel] || 1.2;
  const tdee = bmr * activityFactor;

  const calorieAdjustment = (weightChange * 7700) / 30;
  const adjustedCalories = weightChange >= 0 ? tdee + calorieAdjustment : tdee - Math.abs(calorieAdjustment);

  return {
    requiredCalories: Math.round(adjustedCalories),
    breakdown: {
      bmr: Math.round(bmr),
      activityFactor,
      tdee: Math.round(tdee),
      calorieAdjustment: Math.round(calorieAdjustment),
    },
  };
}

export default function SignUpWithEmail({ route, navigation }) {
  const { userData } = route.params;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email || !password) {
      Alert.alert("Missing Fields", "Please enter email and password.");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const { uid } = userCredential.user;

      // Normalize field names
      const cleanedUserData = {
        ...userData,
        name: userData.name || userData["Let’s start with your name."] || "",
        height: parseFloat(userData.height || "0"),
        weight: parseFloat(userData.weight || "0"),
        targetWeightChange: parseFloat(userData.targetWeightChange || "0"),
      };
      delete cleanedUserData["Let’s start with your name."];

      const { requiredCalories, breakdown } = calculateCalories({
        gender: cleanedUserData.gender,
        weight: cleanedUserData.weight,
        height: cleanedUserData.height,
        birthday: cleanedUserData.birthday,
        activityLevel: cleanedUserData.activityLevel,
        targetWeightChange: cleanedUserData.targetWeightChange,
      });

      await setDoc(doc(db, "users", uid), {
        uid,
        email,
        ...cleanedUserData,
        requiredCalories,
        calorieBreakdown: breakdown,
        createdAt: new Date(),
      });

      Alert.alert("Success", "Your account has been created successfully!");
      // navigation.replace("Home");
    } catch (error) {
      console.error("Signup error:", JSON.stringify(error, null, 2));
      Alert.alert("Signup Error", error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: "#fff" }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Image
            source={require("../../../assets/android/NutriFitLogo.png")}
            style={styles.logo}
          />

          <Text style={styles.subtitle}>
            Take it, Eat it, Reach it with NutriFit
          </Text>

          <Text style={styles.title}>Join NutriFit Today!</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? "eye-off" : "eye"}
                size={20}
                color="#6b7280"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#fff",
    padding: 24,
    justifyContent: "center",
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: "contain",
    alignSelf: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 20,
    textAlign: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#14532d",
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: "#f9fafb",
    marginBottom: 16,
    color: "#111827",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    backgroundColor: "#f9fafb",
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: "#111827",
  },
  eyeIcon: {
    padding: 8,
  },
  button: {
    backgroundColor: "#22c55e",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
