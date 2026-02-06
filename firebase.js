import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// إعدادات Firebase
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// تهيئة التطبيق
const app = initializeApp(firebaseConfig);

// تهيئة المصادقة مع AsyncStorage (مهم في React Native)
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

// تهيئة قاعدة البيانات
const db = getFirestore(app);

// تهيئة الدوال السحابية
const functions = getFunctions(app);

// الاتصال بالمحاكي في بيئة التطوير
if (__DEV__) {
  console.log("Connecting to local Firebase emulators...");
  connectFunctionsEmulator(functions, "localhost", 5001);
}

// تصدير الموديولات
export { app, auth, db, functions };
