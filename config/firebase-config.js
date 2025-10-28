import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from "firebase/app";
//@ts-ignore
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from "firebase/firestore";
import { getStorage } from 'firebase/storage';
import { getDatabase } from "firebase/database"; // ✅ import database

const firebaseConfig = {
  apiKey: "AIzaSyD38v7aPxM-yO2_uoFIYF1DIVj_3SjlQrk",
  authDomain: "nutrifit-d98f5.firebaseapp.com",
  databaseURL: "https://nutrifit-d98f5-default-rtdb.asia-southeast1.firebasedatabase.app", // ✅ add this
  projectId: "nutrifit-d98f5",
  storageBucket: "nutrifit-d98f5.appspot.com",
  messagingSenderId: "443385573457",
  appId: "1:443385573457:web:a81c4a80df6d5251af8870",
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});
export const db = getFirestore(app);
export const storage = getStorage(app);
export const rtdb = getDatabase(app); // ✅ export Realtime Database
