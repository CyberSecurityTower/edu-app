import { 
  doc, getDoc, setDoc, updateDoc, collection, getDocs, 
  arrayUnion, arrayRemove, increment, query, orderBy, 
  limit, where 
} from "firebase/firestore"; 
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
  
  await setDoc(progressRef, { 
    favorites: { 
      subjects: isFavorite ? arrayUnion(subjectId) : arrayRemove(subjectId) 
    } 
  }, { merge: true });
};

export const updateLessonProgress = async (userId, pathId, subjectId, lessonId, status, totalLessonsInSubject) => {
  if (!userId || !pathId || !subjectId || !lessonId || !status) return;
  const progressRef = doc(db, `userProgress/${userId}`);
  
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

// --- Gamification & Stats Functions ---

export const updateUserPoints = async (userId, amount) => {
  if (!userId || typeof amount !== 'number') return;
  const progressRef = doc(db, `userProgress/${userId}`);
  try {
    await setDoc(progressRef, {
      stats: { points: increment(amount) }
    }, { merge: true });
    console.log(`Updated points for user ${userId} by ${amount}`);
  } catch (error) {
    console.error("Error updating user points:", error);
  }
};

export const updateUserDailyStreak = async (userId, newStreakCount, pointsToAdd) => {
  if (!userId) return;
  const progressRef = doc(db, `userProgress/${userId}`);
  try {
    await setDoc(progressRef, {
      lastLogin: new Date(),
      streakCount: newStreakCount,
      stats: { points: increment(pointsToAdd) }
    }, { merge: true });
    console.log(`Daily streak updated for user ${userId}. New streak: ${newStreakCount}. Awarded ${pointsToAdd} points.`);
  } catch (error) {
    console.error("Error updating daily streak:", error);
  }
};

/**
 * [NEW] Updates denormalized user data in the userProgress document.
 * This is called when a user is created or their profile is updated.
 * @param {string} userId The ID of the user.
 * @param {object} profileData An object containing firstName and lastName.
 */
export const updateUserProgressProfileData = async (userId, profileData) => {
  if (!userId || !profileData.firstName || !profileData.lastName) return;

  const progressRef = doc(db, `userProgress/${userId}`);
  const displayName = `${profileData.firstName} ${profileData.lastName}`;
  const avatarUrl = `https://ui-avatars.com/api/?name=${displayName.replace(' ', '+')}&background=3B82F6&color=FFFFFF&size=128`;

  try {
    await setDoc(progressRef, {
      stats: {
        displayName: displayName,
        avatarUrl: avatarUrl,
      }
    }, { merge: true });
    console.log(`Denormalized profile data updated for user ${userId}`);
  } catch (error) {
    console.error("Error updating denormalized profile data:", error);
  }
};

/**
 * [CORRECTED & OPTIMIZED] Fetches the leaderboard with a single, efficient query.
 * Relies on denormalized data (displayName, avatarUrl) in the userProgress collection.
 */
export const getLeaderboard = async () => {
  try {
    // A SINGLE, EFFICIENT, INDEXED QUERY!
    const progressQuery = query(
      collection(db, 'userProgress'), 
      orderBy('stats.points', 'desc'), 
      limit(50) // Get the top 50 users
    );
    
    const progressSnapshot = await getDocs(progressQuery);
    
    if (progressSnapshot.empty) {
      return [];
    }

    // Map the results directly without needing a second query.
    const leaderboard = progressSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        points: data.stats?.points || 0,
        name: data.stats?.displayName || 'Anonymous',
        avatarUrl: data.stats?.avatarUrl, // We now have the avatar URL directly
      };
    });

    return leaderboard;

  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    // This error often means you need to create a Firestore index.
    // The error message in the console will give you a direct link to create it.
    return [];
  }
};
export const updateLessonMasteryScore = async (userId, pathId, subjectId, lessonId, masteryScore, suggestedReview) => {
  if (!userId || !pathId || !subjectId || !lessonId || masteryScore === undefined) return;
  
  const progressRef = doc(db, `userProgress/${userId}`);
  
  // بناء المسار الديناميكي للحقل
  const lessonPath = `pathProgress.${pathId}.subjects.${subjectId}.lessons.${lessonId}`;
  
  await setDoc(progressRef, {
    [lessonPath]: {
      status: 'completed', // نؤكد على أن الدرس مكتمل
      masteryScore: masteryScore,
      suggestedReview: suggestedReview,
      lastAttempt: new Date(),
    }
  }, { merge: true });
};
// --- 3. هذه هي الدالة الجديدة التي أضفناها، بدون أي imports قبلها ---
/**
 * [NEW] Fetches only the dailyTasks object for a user.
 * @param {string} userId The ID of the user.
 * @returns {object | null} The dailyTasks object or null if not found.
 */
export const getUserDailyTasks = async (userId) => {
  if (!userId) return null;
  try {
    const progressRef = doc(db, `userProgress/${userId}`);
    const progressSnap = await getDoc(progressRef);
    if (progressSnap.exists()) {
      const data = progressSnap.data();
      // Return the dailyTasks object, or a default structure if it doesn't exist
      return data.dailyTasks || { generatedAt: null, tasks: [] };
    }
    return null; // Return null if the user progress document doesn't exist
  } catch (error) {
    console.error("Error fetching user daily tasks:", error);
    return null;
  }
};