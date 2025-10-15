import { collection, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore';
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

export const getSubjectDetails = async (pathId, subjectId) => {
  if (!pathId || !subjectId) {
    console.error("Path ID and Subject ID are required.");
    return null;
  }
  
  console.log(`--- Searching for Subject ---`);
  console.log(`Path ID received: ${pathId}`);
  console.log(`Subject ID received: ${subjectId}`);

  try {
    const pathDoc = await getEducationalPathById(pathId);
    
    if (pathDoc && pathDoc.subjects) {
      console.log('Available subject IDs in this path:');
      pathDoc.subjects.forEach(sub => console.log(`- ${sub.id}`)); // Log all available IDs

      const subject = pathDoc.subjects.find(sub => sub.id === subjectId);

      if (subject) {
        console.log('SUCCESS: Subject found!', subject.name);
        return subject;
      } else {
        console.error(`ERROR: Subject with ID "${subjectId}" NOT FOUND in the path.`);
        return null; 
      }
    }
    
    console.warn(`Path with ID ${pathId} not found or has no subjects.`);
    return null;

  } catch (error) {
    console.error("Error inside getSubjectDetails:", error);
    return null;
  }
};