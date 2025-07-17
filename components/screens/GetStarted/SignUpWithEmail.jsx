import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
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

// Harris-Benedict TDEE calculator with dynamic estimated days
function calculateCalories(user) {
  const { Gender, Weight, Height, Age, Activity, TargetKg } = user;

  const heightInCm = parseFloat(Height);
  const weightInKg = parseFloat(Weight);
  const targetWeight = parseFloat(TargetKg || "0");
  const weightChange = targetWeight - weightInKg;
  const age = parseInt(Age);

  if (
    isNaN(heightInCm) ||
    isNaN(weightInKg) ||
    isNaN(weightChange) ||
    isNaN(age)
  ) {
    throw new Error("Invalid height, weight, or age for calorie calculation.");
  }

  // Step 1: BMR calculation
  let bmr = 0;
  if (Gender === "Male") {
    bmr = 88.362 + 13.397 * weightInKg + 4.799 * heightInCm - 5.677 * age;
  } else if (Gender === "Female") {
    bmr = 447.593 + 9.247 * weightInKg + 3.098 * heightInCm - 4.330 * age;
  }

  // Step 2: TDEE using activity level multiplier
  const activityFactors = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    veryActive: 1.9,
  };

  const daysPerKgMap = {
    sedentary: 32,
    light: 28,
    moderate: 22,
    active: 17,
    veryActive: 12,
  };

  const activityFactor = activityFactors[Activity] || 1.2;
  const daysPerKg = daysPerKgMap[Activity] || 30;

  const tdee = bmr * activityFactor;

  // Step 3: Dynamic estimatedDays
  const estimatedDays = Math.max(1, Math.floor(Math.abs(weightChange) * daysPerKg));
  const totalCalorieChange = weightChange * 7700;
  const dailyAdjustment = totalCalorieChange / estimatedDays;

  const adjustedCalories = tdee + dailyAdjustment;

  return {
    requiredCalories: Math.round(adjustedCalories),
    breakdown: {
      bmr: Math.round(bmr),
      activityFactor,
      tdee: Math.round(tdee),
      estimatedDays,
      calorieAdjustment: Math.round(dailyAdjustment),
    },
  };
}


export default function SignUpWithEmail({ route, navigation }) {
  const { userData } = route.params;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [firebaseError, setFirebaseError] = useState("");

  const validateForm = () => {
    setEmailError("");
    setPasswordError("");
    setConfirmPasswordError("");
    setFirebaseError("");

    let isValid = true;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      setEmailError("Email is required.");
      isValid = false;
    } else if (!emailRegex.test(email)) {
      setEmailError("Invalid email format.");
      isValid = false;
    }

    if (!password) {
      setPasswordError("Password is required.");
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      isValid = false;
    }

    if (!confirmPassword) {
      setConfirmPasswordError("Please confirm your password.");
      isValid = false;
    } else if (confirmPassword !== password) {
      setConfirmPasswordError("Passwords do not match.");
      isValid = false;
    }

    return isValid;
  };

  function calculateAge(birthday) {
  if (!birthday) return 0;
  const birthDate = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();

  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}


const handleSignup = async () => {
  if (!validateForm()) return;

  setLoading(true);
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const { uid } = userCredential.user;

    // Convert height if needed
    let finalHeight = userData.Height;
    if (userData.HeightUnit === "ftin") {
      finalHeight = convertFtInToCm(userData.HeightFtIn);
    }

    const parsedWeight =
      userData.WeightUnit === "lb"
        ? parseFloat(userData.Weight) * 0.453592
        : parseFloat(userData.Weight);

    const parsedTarget =
      userData.TargetKgUnit === "lb"
        ? parseFloat(userData.TargetKg) * 0.453592
        : parseFloat(userData.TargetKg);

    const age = calculateAge(userData.Birthday);

    const cleanedUserData = {
      firstName: userData.firstName,
      lastName: userData.lastName,
      Gender: userData.Gender,
      Age: age,
      Birthday: userData.Birthday,
      Goal: userData.Goal,
      Height: parseFloat(finalHeight || "0"),
      HeightUnit: "cm",
      HeightFtIn: userData.HeightFtIn || "",
      Weight: parsedWeight,
      WeightUnit: "kg",
      TargetKg: parsedTarget,
      TargetKgUnit: "kg",
      Activity: userData.Activity,
      HealthConditions: userData.HealthConditions,
      OtherHealthCondition: userData.OtherHealthCondition || "",
      Allergies: userData.Allergies || [],
      OtherAllergy: userData.OtherAllergy || "",
      Medications: userData.Medications || [],
      OtherMedication: userData.OtherMedication || "",
    };

    const { requiredCalories, breakdown } = calculateCalories(cleanedUserData);

    await setDoc(doc(db, "users", uid), {
      uid,
      email,
      ...cleanedUserData,
      requiredCalories,
      calorieBreakdown: breakdown,
      createdAt: new Date(),
    });

    navigation.replace("MainTabs");
  } catch (error) {
    console.error("Signup error:", error);

    if (auth.currentUser) {
      try {
        await auth.currentUser.delete();
        console.log("Rolled back Firebase Auth user due to error.");
      } catch (deleteError) {
        console.error("Failed to delete auth user:", deleteError);
      }
    }

    if (error.code === "auth/email-already-in-use") {
      setEmailError("This email is already in use.");
    } else {
      setFirebaseError(error.message || "Something went wrong.");
    }
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
            style={[
              styles.input,
              emailError && styles.inputError,
            ]}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

        <View style={[styles.passwordContainer, passwordError && styles.inputError]}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
            <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>


          {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

        <View style={[styles.passwordContainer, confirmPasswordError && styles.inputError]}>
  <TextInput
    style={styles.passwordInput}
    placeholder="Confirm Password"
    secureTextEntry={!showConfirmPassword}
    value={confirmPassword}
    onChangeText={setConfirmPassword}
  />
  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
    <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={20} color="#6b7280" />
  </TouchableOpacity>
</View>


          {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}

          {firebaseError ? <Text style={styles.errorText}>{firebaseError}</Text> : null}

          <TouchableOpacity
            style={styles.button}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign Up</Text>}
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
    marginBottom: 8,
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
    marginBottom: 8,
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
  errorText: {
    color: "#dc2626",
    marginBottom: 12,
    marginTop: -4,
    fontSize: 14,
  },
  button: {
    backgroundColor: "#22c55e",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },inputError: {
  borderColor: "#dc2626",
},

});
