// services/firestoreService.js
import { doc, getDoc, collection, getDocs } from 'firebase/firestore'; // Add collection and getDocs
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