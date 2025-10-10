  import { initializeApp } from "firebase/app";
    import { getFirestore } from "firebase/firestore";
    // NEW IMPORTS
    import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
    import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
  import { doc, updateDoc} from 'firebase/firestore';
import { db } from '../firebase';
    const firebaseConfig = {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
    };

    const app = initializeApp(firebaseConfig);

    // UPGRADED AUTH INITIALIZATION
    export const auth = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage)
    });

    export const db = getFirestore(app);
    export const updateUserProfile = async (uid, data) => {
  if (!uid) throw new Error("User ID is required to update profile.");
  try {
    const userDocRef = doc(db, 'users', uid);
    // This line takes the 'data' object and applies its changes to the document in Firestore.
    await updateDoc(userDocRef, data); 
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};