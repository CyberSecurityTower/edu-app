// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

// ⚡ إعدادات Firebase من ملف .env أو expo config
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// 🔥 تهيئة التطبيق
const app = initializeApp(firebaseConfig);

// 👤 تهيئة المصادقة (Auth) مع AsyncStorage
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

// 📚 تهيئة قاعدة البيانات Firestore
const db = getFirestore(app);

// ⚙️ تهيئة الدوال السحابية Functions
const functions = getFunctions(app);

// 🧩 الاتصال بالمحاكيات أثناء التطوير فقط
if (__DEV__) {
  console.log("✅ Connected to Firebase local emulators...");
  connectFunctionsEmulator(functions, "localhost", 5001);
}

// 🚀 تصدير الموديولات
export { app, auth, db, functions };
