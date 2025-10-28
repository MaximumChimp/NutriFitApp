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
  Alert 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  getDatabase,
  ref,
  set,
  onDisconnect,
  onValue
} from "firebase/database";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db } from "../../../config/firebase-config";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [firebaseError, setFirebaseError] = useState("");

  // --- Form Validation ---
  const validateForm = () => {
    setEmailError("");
    setPasswordError("");
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
    }

    return isValid;
  };

// --- Login Handler ---
const handleLogin = async () => {
  if (!validateForm()) return;

  setLoading(true);
  setFirebaseError("");

  try {
    // 🔍 Step 1: Find user document by email before signing in
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      setFirebaseError("No account found with this email.");
      setLoading(false);
      return;
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    if (userData.status === "blocked") {
      Alert.alert(
        "Account Blocked",
        "Your account has been blocked. Please contact support for assistance."
      );
      setLoading(false);
      return; // 🚫 Stop here — don't log in
    }

    // ✅ Step 2: Sign in only if not blocked
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // ✅ Update Firestore status to active
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, { status: "active" });

    // ✅ Extract createdAt (convert Firestore timestamp if needed)
    let createdAtValue = "";
    if (userData.createdAt) {
      if (userData.createdAt.toDate) {
        // Firestore Timestamp
        createdAtValue = userData.createdAt.toDate().toISOString();
      } else if (typeof userData.createdAt === "string") {
        // Already in string form
        createdAtValue = userData.createdAt;
      } else {
        // Fallback
        createdAtValue = new Date().toISOString();
      }
    } else {
      createdAtValue = new Date().toISOString();
    }

    // ✅ Save to AsyncStorage (cache basic profile info including createdAt)
    const cachedProfile = {
      uid: user.uid,
      firstName: userData.firstName || "",
      lastName: userData.lastName || "",
      email: userData.email || email, // fallback
      phone: userData.phone || "",
      createdAt: createdAtValue,       // ✅ added createdAt
    };
    await AsyncStorage.setItem("userProfile", JSON.stringify(cachedProfile));

    // ✅ Set presence in RTDB
    const rtdb = getDatabase();
    const userStatusRef = ref(rtdb, `/availability/${user.uid}`);
    const connectedRef = ref(rtdb, ".info/connected");

    onValue(connectedRef, (snapshot) => {
      if (snapshot.val() === true) {
        set(userStatusRef, {
          state: "online",
          lastChanged: Date.now(),
        });
        onDisconnect(userStatusRef).set({
          state: "offline",
          lastChanged: Date.now(),
        });
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    if (error.code === "auth/invalid-login-credentials") {
      setFirebaseError("Incorrect email or password.");
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
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Image
            source={require("../../../assets/NutriFitLogo.png")}
            style={styles.logo}
          />

          <Text style={styles.subtitle}>
            Take it, Eat it, Reach it with NutriFit
          </Text>

          <Text style={styles.title}>Stay on track</Text>

          <TextInput
            style={[styles.input, emailError && styles.inputError]}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

          <View
            style={[styles.passwordContainer, passwordError && styles.inputError]}
          >
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={showPassword ? "eye-off" : "eye"}
                size={20}
                color="#6b7280"
              />
            </TouchableOpacity>
          </View>
          {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

          {firebaseError ? (
            <Text style={styles.errorText}>{firebaseError}</Text>
          ) : null}

          <TouchableOpacity
            style={styles.button}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Log In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("GetStarted", { fromLogin: true })}
          >
            <Text style={styles.signUpLink}>
              Don’t have an account? Sign up
            </Text>
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
  },
  inputError: {
    borderColor: "#dc2626",
  },
  signUpLink: {
    color: "#22c55e",
    textAlign: "center",
    marginTop: 16,
  },
});
