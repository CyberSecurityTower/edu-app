import { doc, getDoc, setDoc, updateDoc, collection, getDocs, arrayUnion, arrayRemove } from "firebase/firestore"; 
import { db } from '../firebase';

// --- User Profile Functions ---
export const getUserProfile = async (uid) => {
  if (!uid) return null;
  try {
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);
    return userDocSnap.exists() ? userDocSnap.data() : null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
};

export const updateUserProfile = async (uid, data) => {
  if (!uid) throw new Error("User ID is required to update profile.");
  const userDocRef = doc(db, 'users', uid);
  await updateDoc(userDocRef, data);
};

// --- Educational Content Functions ---
export const getEducationalPaths = async () => {
  try {
    const pathsCollectionRef = collection(db, 'educationalPaths');
    const querySnapshot = await getDocs(pathsCollectionRef);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching educational paths:", error);
    return [];
  }
};

export const getEducationalPathById = async (pathId) => {
  if (!pathId) return null;
  const pathDocRef = doc(db, 'educationalPaths', pathId);
  const pathDocSnap = await getDoc(pathDocRef);
  return pathDocSnap.exists() ? { id: pathDocSnap.id, ...pathDocSnap.data() } : null;
};

export const getSubjectDetails = async (pathId, subjectId) => {
  if (!pathId || !subjectId) return null;
  try {
    const pathDoc = await getEducationalPathById(pathId);
    if (pathDoc?.subjects) {
      const subject = pathDoc.subjects.find(sub => sub.id === subjectId);
      return subject || null;
    }
    return null;
  } catch (error) {
    console.error("Error getting subject details:", error);
    return null;
  }
};

export const getLessonContent = async (lessonId) => {
  if (!lessonId) return null;
  const lessonRef = doc(db, 'lessonsContent', lessonId);
  const lessonSnap = await getDoc(lessonRef);
  return lessonSnap.exists() ? lessonSnap.data() : null;
};

// --- User Progress Functions ---
export const getUserProgressDocument = async (userId) => {
  if (!userId) return null;
  const progressRef = doc(db, `userProgress/${userId}`);
  const progressSnap = await getDoc(progressRef);
  return progressSnap.exists() ? progressSnap.data() : null;
};

// --- THE FINAL, MANUAL, AND BULLETPROOF FIX ---
export const updateUserFavoriteSubject = async (userId, subjectId, isFavorite) => {
  // --- DEBUGGING STEP 2: VERIFY DATA RECEIVED ---
  console.log(`--- Firestore Service Function Started ---`);
  console.log(`Received User ID: ${userId}`);
  console.log(`Received Subject ID: ${subjectId}`);
  console.log(`Received isFavorite: ${isFavorite}`);

  if (!userId || !subjectId) {
    console.error("Function stopped: Missing userId or subjectId.");
    return;
  }
  const progressRef = doc(db, `userProgress/${userId}`);

  try {
    console.log("Step A: Attempting to get document from Firestore...");
    const docSnap = await getDoc(progressRef);

    if (docSnap.exists()) {
      console.log("Step B: Document EXISTS. Proceeding with 'Read-Modify-Write'.");
      const progressData = docSnap.data();
      
      // --- DEBUGGING STEP 3: LOG CURRENT DATA ---
      console.log("Current document data:", JSON.stringify(progressData, null, 2));
      
      const currentFavorites = (progressData.favorites?.subjects || []).filter(id => id);
      console.log("Step C: Read and cleaned current favorites array:", currentFavorites);

      let newFavorites;
      if (isFavorite) {
        newFavorites = [...new Set([...currentFavorites, subjectId])];
        console.log("Step D: Adding subject. New favorites array will be:", newFavorites);
      } else {
        newFavorites = currentFavorites.filter(id => id !== subjectId);
        console.log("Step D: Removing subject. New favorites array will be:", newFavorites);
      }
      
      console.log("Step E: Attempting to 'updateDoc' with new array...");
      await updateDoc(progressRef, {
        'favorites.subjects': newFavorites
      });
      console.log("SUCCESS: 'updateDoc' completed without error.");

    } else {
      console.log("Step B: Document DOES NOT EXIST. Proceeding to create it.");
      if (isFavorite) {
        const newDocData = {
          favorites: {
            subjects: [subjectId]
          }
        };
        console.log("Step D: Creating new document with data:", JSON.stringify(newDocData, null, 2));
        console.log("Step E: Attempting to 'setDoc'...");
        await setDoc(progressRef, newDocData, { merge: true });
        console.log("SUCCESS: 'setDoc' completed without error.");
      } else {
        console.log("Skipping write because isFavorite is false and document doesn't exist.");
      }
    }
  } catch (error) {
    // --- DEBUGGING STEP 4: CATCH AND LOG ANY AND ALL ERRORS ---
    console.error("---!!! CRITICAL ERROR CAUGHT !!!---");
    console.error("Error Code:", error.code);
    console.error("Error Message:", error.message);
    console.error("Full Error Object:", error);
    console.error("------------------------------------");
  }
};

export const updateLessonProgress = async (userId, pathId, subjectId, lessonId, status, totalLessonsInSubject) => {
  if (!userId || !pathId || !subjectId || !lessonId || !status) return;
  const progressRef = doc(db, `userProgress/${userId}`);
  
  await setDoc(progressRef, {
    [`pathProgress.${pathId}.subjects.${subjectId}.lessons.${lessonId}`]: status
  }, { merge: true });

  if (status === 'completed') {
    const progressDoc = await getUserProgressDocument(userId);
    const lessonsMap = progressDoc?.pathProgress?.[pathId]?.subjects?.[subjectId]?.lessons || {};
    
    const completedCount = Object.values(lessonsMap).filter(s => s === 'completed').length;
    const newProgress = totalLessonsInSubject > 0 ? Math.round((completedCount / totalLessonsInSubject) * 100) : 0;

    const progressKey = `pathProgress.${pathId}.subjects.${subjectId}.progress`;
    await updateDoc(progressRef, { [progressKey]: newProgress });
  }
};

export const searchSubjectsByName = async (searchText) => {
  if (!searchText || searchText.trim().length < 3) {
    return [];
  }
  try {
    const pathsCollectionRef = collection(db, 'educationalPaths');
    const querySnapshot = await getDocs(pathsCollectionRef);
    const results = [];
    const normalizedSearchText = searchText.toLowerCase();
    querySnapshot.forEach(doc => {
      const pathData = doc.data();
      const pathId = doc.id;
      if (pathData.subjects && Array.isArray(pathData.subjects)) {
        pathData.subjects.forEach(subject => {
          if (subject.name.toLowerCase().includes(normalizedSearchText)) {
            results.push({
              ...subject,
              faculty: pathData.displayName || 'N/A',
              pathId: pathId,
            });
          }
        });
      }
    });
    return results;
  } catch (error) {
    console.error("Error searching subjects:", error);
    return [];
  }
};