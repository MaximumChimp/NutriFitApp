// config/firebase-config.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyD38v7aPxM-yO2_uoFIYF1DIVj_3SjlQrk",
  authDomain: "nutrifit-d98f5.firebaseapp.com",
  projectId: "nutrifit-d98f5",
  storageBucket: "nutrifit-d98f5.appspot.com",
  messagingSenderId: "443385573457",
  appId: "1:443385573457:web:a81c4a80df6d5251af8870"
};

// ✅ Prevent duplicate app init
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ✅ Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// ✅ Firestore properly initialized
const db = getFirestore(app);

export { app, auth, db };
