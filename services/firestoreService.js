// services/firestoreService.js

import { doc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore'; // Add updateDoc
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

// NEW FUNCTION
export const updateUserProfile = async (uid, data) => {
  if (!uid) throw new Error("User ID is required to update profile.");
  try {
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, data);
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error; // Re-throw the error to be caught by the calling function
  }
};