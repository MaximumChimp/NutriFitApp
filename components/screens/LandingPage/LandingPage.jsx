import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";

export default function LandingPage({ navigation }) {
  // Animated values
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonTranslateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Animate logo first, then buttons
    Animated.sequence([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(buttonTranslateY, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Animated Logo */}
      <Animated.Image
        source={require("../../../assets/android/NutriFitLogo.png")}
        style={[styles.logo, { opacity: logoOpacity }]}
        resizeMode="contain"
      />

      {/* Animated Welcome Text */}
      {/* <Animated.Text style={[styles.title, { opacity: logoOpacity }]}>
        NutriFit
      </Animated.Text> */}
      <Animated.Text style={[styles.subtitle, { opacity: logoOpacity }]}>
        Take it , Eat it , Reach it with NutriFit
      </Animated.Text>

      {/* Animated Buttons */}
      <Animated.View
      >
        <TouchableOpacity
          style={styles.primaryButton}
           onPress={() => navigation.navigate("GetStarted")}
           
        >
          <Text style={styles.primaryButtonText}>I am a new user</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.secondaryButtonText}>I already have an account</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#14532d",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 20,
    textAlign: "center",
  },
  buttonGroup: {
    width: "100%",
  },
  primaryButton: {
    backgroundColor: "#22c55e",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12  
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold"
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: "#22c55e",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#22c55e",
    fontSize: 16,
    fontWeight: "bold",
    paddingHorizontal:10
  },
});
