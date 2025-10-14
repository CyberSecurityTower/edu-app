
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from "firebase/firestore"; 
import { db } from '../firebase'; // Note the path: ../firebase

/**
 * Fetches a user's profile from the 'users' collection.
 * @param {string} uid - The user's unique ID.
 * @returns {object|null} The user profile data or null if not found.
 */
export const getUserProfile = async (uid) => {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    return userSnap.exists() ? userSnap.data() : null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
};

/**
 * Updates a user's profile in the 'users' collection.
 * @param {string} uid - The user's unique ID.
 * @param {object} data - The data to update.
 */
export const updateUserProfile = async (uid, data) => {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, data);
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error; // Re-throw to handle it in the component
  }
};

/**
 * Fetches all available educational paths.
 * @returns {Array} An array of educational path objects.
 */
export const getEducationalPaths = async () => {
    try {
        const pathsCollection = collection(db, 'educationalPaths');
        const pathsSnapshot = await getDocs(pathsCollection);
        return pathsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching educational paths:", error);
        return [];
    }
};

/**
 * Fetches a single educational path by its ID.
 * @param {string} pathId - The ID of the educational path.
 * @returns {object|null} The path data or null if not found.
 */
export const getEducationalPathById = async (pathId) => {
    try {
        const pathRef = doc(db, 'educationalPaths', pathId);
        const pathSnap = await getDoc(pathRef);
        return pathSnap.exists() ? { id: pathSnap.id, ...pathSnap.data() } : null;
    } catch (error) {
        console.error("Error fetching educational path by ID:", error);
        return null;
    }
};