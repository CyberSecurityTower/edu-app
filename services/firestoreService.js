import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

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