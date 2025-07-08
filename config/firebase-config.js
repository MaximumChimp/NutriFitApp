// config/firebase-config.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyD38v7aPxM-yO2_uoFIYF1DIVj_3SjlQrk",
  authDomain: "nutrifit-d98f5.firebaseapp.com",
  projectId: "nutrifit-d98f5",
  storageBucket: "nutrifit-d98f5.appspot.com",
  messagingSenderId: "443385573457",
  appId: "1:443385573457:web:a81c4a80df6d5251af8870",
};

let app;
let auth;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);

  // ✅ Only initializeAuth once
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} else {
  app = getApp();
  auth = getAuth(app);
}

const db = getFirestore(app);

export { app, auth, db };
