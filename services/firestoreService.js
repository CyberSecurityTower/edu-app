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

// --- THE BULLETPROOF, FINAL, GUARANTEED FIX ---
export const updateUserFavoriteSubject = async (userId, subjectId, isFavorite) => {
  if (!userId || !subjectId) return;
  const progressRef = doc(db, `userProgress/${userId}`);

  // First, check if the document exists at all.
  const docSnap = await getDoc(progressRef);

  if (docSnap.exists()) {
    // If the document exists, we can safely use updateDoc.
    // This is the most efficient method for existing documents.
    await updateDoc(progressRef, {
      'favorites.subjects': isFavorite ? arrayUnion(subjectId) : arrayRemove(subjectId)
    });
  } else {
    // If the document does NOT exist (e.g., a brand new user),
    // we use setDoc to create it from scratch.
    // This ensures the 'subjects' field is correctly created as an ARRAY.
    if (isFavorite) {
      await setDoc(progressRef, {
        favorites: {
          subjects: [subjectId] // CRITICAL: Initialize as an array
        }
      }, { merge: true }); // Merge in case other fields are being created simultaneously
    }
    // If isFavorite is false, we don't need to do anything because the document
    // and the array don't exist, so there's nothing to remove.
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