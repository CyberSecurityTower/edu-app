import { doc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase'; // هذا الاستيراد صحيح الآن لأنه ليس دائريًا'
export const getUserProfile = async (uid) => {
  if (!uid) return null;
  try {
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      return { uid, ...userDocSnap.data() };
    } else {
      console.warn("No user profile found in Firestore for UID:", uid);
      return null;
    }
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
};

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
    return [];
  }
};

export const updateUserProfile = async (uid, data) => {
  if (!uid) throw new Error("User ID is required to update profile.");
  try {
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, data);
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};
export const getEducationalPathById = async (pathId) => {
  if (!pathId) return null;
  try {
    const pathDocRef = doc(db, 'educationalPaths', pathId);
    const pathDocSnap = await getDoc(pathDocRef);
    if (pathDocSnap.exists()) {
      return { id: pathDocSnap.id, ...pathDocSnap.data() };
    } else {
      console.warn("No educational path found for ID:", pathId);
      return null;
    }
  } catch (error) {
    console.error("Error fetching educational path by ID:", error);
    return null;
  }
};