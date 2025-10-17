import { doc, getDoc, setDoc, updateDoc, collection, getDocs, arrayUnion, arrayRemove ,increment } from "firebase/firestore"; 
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

export const updateUserFavoriteSubject = async (userId, subjectId, isFavorite) => {
  if (!userId || !subjectId) return;
  const progressRef = doc(db, `userProgress/${userId}`);
  const favoriteKey = 'favorites.subjects';
  
  await setDoc(progressRef, { 
    favorites: { 
      subjects: isFavorite ? arrayUnion(subjectId) : arrayRemove(subjectId) 
    } 
  }, { merge: true });
};

export const updateLessonProgress = async (userId, pathId, subjectId, lessonId, status, totalLessonsInSubject) => {
  if (!userId || !pathId || !subjectId || !lessonId || !status) return;
  const progressRef = doc(db, `userProgress/${userId}`);
  const lessonKey = `pathProgress.${pathId}.subjects.${subjectId}.lessons.${lessonId}`;
  
  await setDoc(progressRef, {
    pathProgress: { [pathId]: { subjects: { [subjectId]: { lessons: { [lessonId]: status } } } } }
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

/**
 * Fetches the study kit (summary, quiz, flashcards) for a specific lesson.
 * @param {string} lessonId The ID of the lesson.
 * @returns {Promise<object|null>} The study kit data or null if not found.
 */
export const getStudyKit = async (lessonId) => {
  if (!lessonId) return null;
  try {
    const kitDocRef = doc(db, 'studyKits', lessonId);
    const kitDocSnap = await getDoc(kitDocRef);
    return kitDocSnap.exists() ? kitDocSnap.data() : null;
  } catch (error) {
    console.error("Error fetching study kit:", error);
    return null;
  }
};

// --- NEW GAMIFICATION FUNCTION ---

/**
 * Updates the user's points by a given amount.
 * Can be used for both adding and subtracting points.
 * @param {string} userId The ID of the user.
 * @param {number} amount The number of points to add (can be negative to subtract).
 */
export const updateUserPoints = async (userId, amount) => {
  if (!userId || typeof amount !== 'number') return;
  
  const progressRef = doc(db, `userProgress/${userId}`);
  
  try {
    // Using increment is atomic and safe for concurrent updates.
    await setDoc(progressRef, {
      stats: {
        points: increment(amount)
      }
    }, { merge: true });
    console.log(`Updated points for user ${userId} by ${amount}`);
  } catch (error) {
    console.error("Error updating user points:", error);
  }
};
// --- NEW DAILY STREAK FUNCTION ---

/**
 * Updates the user's daily streak, awards points, and sets the new login time.
 * @param {string} userId The ID of the user.
 * @param {number} newStreakCount The new streak count (e.g., 1, 2, 3...).
 * @param {number} pointsToAdd The amount of points for the daily bonus.
 */
export const updateUserDailyStreak = async (userId, newStreakCount, pointsToAdd) => {
  if (!userId) return;
  
  const progressRef = doc(db, `userProgress/${userId}`);
  
  try {
    await setDoc(progressRef, {
      lastLogin: new Date(), // Set login time to now
      streakCount: newStreakCount,
      stats: {
        points: increment(pointsToAdd)
      }
    }, { merge: true });
    console.log(`Daily streak updated for user ${userId}. New streak: ${newStreakCount}. Awarded ${pointsToAdd} points.`);
  } catch (error) {
    console.error("Error updating daily streak:", error);
  }
};