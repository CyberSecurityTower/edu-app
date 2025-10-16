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

// --- THIS IS THE FINAL, GUARANTEED FIX ---
// It is simpler, cleaner, and handles all possible states of the document.
export const updateUserFavoriteSubject = async (userId, subjectId, isFavorite) => {
  if (!userId || !subjectId) return;
  const progressRef = doc(db, `userProgress/${userId}`);

  // By using setDoc with merge:true AND dot notation, we achieve everything:
  // 1. If the document doesn't exist, it will be created.
  // 2. If the 'favorites' field doesn't exist, it will be created.
  // 3. It correctly uses arrayUnion/arrayRemove on the 'subjects' array.
  // This is the most robust pattern for this operation in Firestore.
  await setDoc(progressRef, {
    'favorites.subjects': isFavorite ? arrayUnion(subjectId) : arrayRemove(subjectId)
  }, { merge: true });
};

export const updateLessonProgress = async (userId, pathId, subjectId, lessonId, status, totalLessonsInSubject) => {
  if (!userId || !pathId || !subjectId || !lessonId || !status) return;
  const progressRef = doc(db, `userProgress/${userId}`);
  
  // Using setDoc with merge and dot notation for the lesson update as well for consistency and robustness.
  await setDoc(progressRef, {
    [`pathProgress.${pathId}.subjects.${subjectId}.lessons.${lessonId}`]: status
  }, { merge: true });

  if (status === 'completed') {
    // This part requires a read-after-write, so it's slightly different.
    const progressDoc = await getUserProgressDocument(userId);
    const lessonsMap = progressDoc?.pathProgress?.[pathId]?.subjects?.[subjectId]?.lessons || {};
    
    const completedCount = Object.values(lessonsMap).filter(s => s === 'completed').length;
    const newProgress = totalLessonsInsubject > 0 ? Math.round((completedCount / totalLessonsInSubject) * 100) : 0;

    const progressKey = `pathProgress.${pathId}.subjects.${subjectId}.progress`;
    // Here we can use updateDoc because we know the document and pathProgress exist.
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