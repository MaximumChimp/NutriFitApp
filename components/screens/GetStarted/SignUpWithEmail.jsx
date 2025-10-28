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
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "@/config/firebase-config";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Activity options
const activityOptions = [
  { label: "Sedentary", id: 1, description: "Little to no physical activity (0-2 Days, e.g., sitting most of the day)" },
  { label: "Lightly Active", id: 2, description: "Light exercise or sports 1–3 days a week" },
  { label: "Moderately Active", id: 3, description: "Moderate exercise or sports 3–5 days a week" },
  { label: "Very Active", id: 4, description: "Hard exercise or sports 6–7 days a week" },
  { label: "Extremely Active", id: 5, description: "Very hard exercise or physical job, or training twice a day" },
];

const activityValues = {
  1: 1.2,
  2: 1.375,
  3: 1.55,
  4: 1.725,
  5: 1.9,
};

// Utility: convert ft/in to cm
const convertFtInToCm = (ftIn) => {
  if (!ftIn) return 0;
  const [ft, inch] = ftIn.split("'").map((v) => parseFloat(v));
  return ft * 30.48 + (inch || 0) * 2.54;
};

// Calculate age from birthday
const calculateAge = (birthday) => {
  if (!birthday) return 0;
  const birthDate = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
};

// Harris-Benedict TDEE calculator with goal adjustment
const calculateCalories = (user) => {
  const { Gender, Weight, Height, Age, Activity, Goal } = user;

  const heightInCm = parseFloat(Height);
  const weightInKg = parseFloat(Weight);
  const age = parseInt(Age);

  if (isNaN(heightInCm) || isNaN(weightInKg) || isNaN(age)) {
    throw new Error("Invalid height, weight, or age for calorie calculation.");
  }

  // Step 1: BMR
  let bmr = 0;
  if (Gender === "Male") bmr = 88.362 + 13.397 * weightInKg + 4.799 * heightInCm - 5.677 * age;
  else if (Gender === "Female") bmr = 447.593 + 9.247 * weightInKg + 3.098 * heightInCm - 4.330 * age;

  // Step 2: TDEE
  const activityFactor = parseFloat(Activity) || 1.2;
  let tdee = bmr * activityFactor;

  // Step 3: Adjust based on goal
  if (Goal === "Weight Loss") tdee -= 300;
  else if (Goal === "Weight Gain") tdee += 300;

  return {
    requiredCalories: Math.round(tdee),
    breakdown: {
      bmr: Math.round(bmr),
      activityFactor,
      tdee: Math.round(tdee),
      goalAdjustment: Goal === "Weight Loss" ? -300 : Goal === "Weight Gain" ? 300 : 0
    },
  };
};

export default function SignUpWithEmail({ route, navigation }) {
  const { userData } = route.params;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [firebaseError, setFirebaseError] = useState("");

  // Validate form
  const validateForm = () => {
    setEmailError(""); setPasswordError(""); setConfirmPasswordError(""); setFirebaseError("");
    let isValid = true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) { setEmailError("Email is required."); isValid = false; }
    else if (!emailRegex.test(email)) { setEmailError("Invalid email format."); isValid = false; }

    if (!password) { setPasswordError("Password is required."); isValid = false; }
    else if (password.length < 6) { setPasswordError("Password must be at least 6 characters."); isValid = false; }

    if (!confirmPassword) { setConfirmPasswordError("Please confirm your password."); isValid = false; }
    else if (confirmPassword !== password) { setConfirmPasswordError("Passwords do not match."); isValid = false; }

    return isValid;
  };

  // Handle signup
  const handleSignup = async () => {
    if (!validateForm()) return;
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const { uid } = userCredential.user;

      // Convert height
      let finalHeight = userData.HeightUnit === "ftin" ? convertFtInToCm(userData.HeightFtIn) : parseFloat(userData.Height);

      // Convert weight
      const weightKg = userData.WeightUnit === "lb" ? parseFloat(userData.Weight) * 0.453592 : parseFloat(userData.Weight);

      // Convert target
      const targetKg = userData.TargetKgUnit === "lb" ? parseFloat(userData.TargetKg) * 0.453592 : parseFloat(userData.TargetKg);

      // Calculate age
      const age = calculateAge(userData.Birthday);

      // Numeric activity factor
      const numericActivity = activityValues[userData.ActivityId] || 1.2;

      const cleanedUserData = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        Gender: userData.Gender,
        Age: age,
        Birthday: userData.Birthday,
        Goal: userData.Goal,
        Height: finalHeight,
        HeightUnit: "cm",
        HeightFtIn: userData.HeightFtIn || "",
        Weight: weightKg,
        WeightUnit: "kg",
        TargetKg: targetKg,
        TargetKgUnit: "kg",
        ActivityId: userData.ActivityId,
        ActivityLabel: activityOptions.find(a => a.id === userData.ActivityId)?.label || "Sedentary",
        Activity: numericActivity,
        HealthConditions: userData.HealthConditions,
        OtherHealthCondition: userData.OtherHealthCondition || "",
        Allergies: userData.Allergies || [],
        OtherAllergy: userData.OtherAllergy || "",
        Medications: userData.Medications || [],
        OtherMedication: userData.OtherMedication || "",
        phone: userData.phone || "",
      };

      const { requiredCalories, breakdown } = calculateCalories(cleanedUserData);

      const createdAt = new Date();
      // Save to Firestore
      await setDoc(doc(db, "users", uid), {
        uid,
        email,
        ...cleanedUserData,
        requiredCalories,
        calorieBreakdown: breakdown,
        createdAt
      });

      // Save minimal profile locally
      await AsyncStorage.setItem("userProfile", JSON.stringify({
        uid, firstName: userData.firstName, 
        lastName: userData.lastName, 
        email, 
        phone: userData.phone || "",
        createdAt: createdAt.toISOString(), 
      }));

     
    } catch (error) {
      console.error("Signup error:", error);

      if (auth.currentUser) {
        try { await auth.currentUser.delete(); } catch (err) { console.error("Rollback failed:", err); }
      }

      if (error.code === "auth/email-already-in-use") setEmailError("This email is already in use.");
      else setFirebaseError(error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#fff" }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Image source={require("../../../assets/NutriFitLogo.png")} style={styles.logo} />
          <Text style={styles.subtitle}>Take it, Eat it, Reach it with NutriFit</Text>
          <Text style={styles.title}>Join NutriFit Today!</Text>

          <TextInput style={[styles.input, emailError && styles.inputError]} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

          <View style={[styles.passwordContainer, passwordError && styles.inputError]}>
            <TextInput style={styles.passwordInput} placeholder="Password" secureTextEntry={!showPassword} value={password} onChangeText={setPassword} />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
          {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

          <View style={[styles.passwordContainer, confirmPasswordError && styles.inputError]}>
            <TextInput style={styles.passwordInput} placeholder="Confirm Password" secureTextEntry={!showConfirmPassword} value={confirmPassword} onChangeText={setConfirmPassword} />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
              <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
          {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}

          {firebaseError ? <Text style={styles.errorText}>{firebaseError}</Text> : null}

          <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign Up</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#fff", padding: 24, justifyContent: "center" },
  logo: { width: 120, height: 120, resizeMode: "contain", alignSelf: "center", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#6b7280", marginBottom: 20, textAlign: "center" },
  title: { fontSize: 24, fontWeight: "700", color: "#14532d", marginBottom: 24, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, fontSize: 16, backgroundColor: "#f9fafb", marginBottom: 8, color: "#111827" },
  passwordContainer: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, backgroundColor: "#f9fafb", paddingHorizontal: 12, marginBottom: 8 },
  passwordInput: { flex: 1, height: 48, fontSize: 16, color: "#111827" },
  eyeIcon: { padding: 8 },
  errorText: { color: "#dc2626", marginBottom: 12, marginTop: -4, fontSize: 14 },
  button: { backgroundColor: "#22c55e", paddingVertical: 14, borderRadius: 10, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  inputError: { borderColor: "#dc2626" },
});
