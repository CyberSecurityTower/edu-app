// services/firestoreService.js

import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore'; // تأكد من استيراد updateDoc
import { db } from '../firebase';

export const getUserProfile = async (uid) => {
  // ... (this function remains the same)
};

// NEW FUNCTION
export const getEducationalPaths = async () => {
  try {
    const pathsCollectionRef = collection(db, 'educationalPaths');
    const querySnapshot = await getDocs(pathsCollectionRef);
    const paths = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return paths;
  } catch (error) {
    console.error("Error fetching educational paths:", error);
    return []; // Return an empty array on error
  }
};
export const updateUserProfile = async (uid, data) => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, data);
    console.log(`User profile ${uid} updated successfully.`);
    return { success: true };
  } catch (error) {
    console.error("Error updating user profile:", error);
    return { success: false, error: error.message };
  }
};