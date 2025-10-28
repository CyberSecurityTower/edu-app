
import { 
  doc, getDoc, setDoc, updateDoc, collection, getDocs, 
  arrayUnion, arrayRemove, increment, query, orderBy, 
  limit, where, writeBatch, addDoc, serverTimestamp, deleteDoc 
} from "firebase/firestore"; 
import { db } from '../firebase';
import Toast from 'react-native-toast-message';

// --- ✨ [NEW] Notification Functions ---

/**
 * Sends a notification to the user's inbox in Firestore and optionally shows a Toast.
 * @param {string} userId - The ID of the user.
 * @param {object} payload - The notification content.
 * @param {string} payload.title - The title for the notification.
 * @param {string} payload.message - The main message content.
 * @param {object} payload.meta - Metadata for navigation (e.g., { type: 'lesson', lessonId: '...' }).
 * @param {boolean} [showToast=true] - Whether to show a pop-up toast message.
 */
export const sendAndDisplayNotification = async (userId, { title, message, meta }, showToast = true) => {
  if (!userId) return;
  try {
    const notificationsRef = collection(db, 'userNotifications', userId, 'inbox');
    await addDoc(notificationsRef, {
      message,
      meta: { ...meta, title },
      read: false,
      createdAt: serverTimestamp(),
    });

    if (showToast) {
      Toast.show({
        type: 'eduai_notification',
        text1: title,
        text2: message,
        position: 'top',
        visibilityTime: 5000,
      });
    }
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};

export const markNotificationAsRead = async (userId, notificationId) => {
  if (!userId || !notificationId) return;
  const notifRef = doc(db, 'userNotifications', userId, 'inbox', notificationId);
  await updateDoc(notifRef, { read: true });
};

export const markAllNotificationsAsRead = async (userId, notificationIds) => {
  if (!userId || !notificationIds || notificationIds.length === 0) return;
  const batch = writeBatch(db);
  notificationIds.forEach(id => {
    const notifRef = doc(db, 'userNotifications', userId, 'inbox', id);
    batch.update(notifRef, { read: true });
  });
  await batch.commit();
};
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

// --- ✨ [NEW] Function to get all subjects for a path ---
/**
 * Fetches all subjects within a specific educational path.
 * @param {string} pathId The ID of the educational path.
 * @returns {Array<object>} An array of subject objects.
 */
export const getAllSubjectsForPath = async (pathId) => {
  if (!pathId) return [];
  try {
    const pathData = await getEducationalPathById(pathId);
    // Return subjects with their original names (e.g., 'name' not 'label')
    return pathData?.subjects || [];
  } catch (error) {
    console.error("Error fetching subjects for path:", error);
    return [];
  }
};

// --- ✨ [NEW] Function to get all lessons for a subject ---
/**
 * Fetches all lessons within a specific subject of an educational path.
 * @param {string} pathId The ID of the educational path.
 * @param {string} subjectId The ID of the subject.
 * @returns {Array<object>} An array of lesson objects.
 */
export const getLessonsForSubject = async (pathId, subjectId) => {
  if (!pathId || !subjectId) return [];
  try {
    const subjectData = await getSubjectDetails(pathId, subjectId);
    // Return lessons with their original names (e.g., 'title' as 'name' for consistency)
    return (subjectData?.lessons || []).map(lesson => ({ id: lesson.id, name: lesson.title }));
  } catch (error) {
    console.error("Error fetching lessons for subject:", error);
    return [];
  }
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
  
  // Update the lesson status
  const lessonPath = `pathProgress.${pathId}.subjects.${subjectId}.lessons.${lessonId}.status`;
  await updateDoc(progressRef, { [lessonPath]: status });

  // Recalculate and update the subject progress only if the lesson is completed
  if (status === 'completed') {
    const progressDoc = await getUserProgressDocument(userId);
    const lessonsMap = progressDoc?.pathProgress?.[pathId]?.subjects?.[subjectId]?.lessons || {};
    
    const completedCount = Object.values(lessonsMap).filter(lesson => lesson.status === 'completed').length;
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

export const updateLessonMasteryScore = async (userId, pathId, subjectId, lessonId, masteryScore, suggestedReview) => {
  if (!userId || !pathId || !subjectId || !lessonId || masteryScore === undefined) return;
  
  const progressRef = doc(db, `userProgress/${userId}`);
  
  const lessonPath = `pathProgress.${pathId}.subjects.${subjectId}.lessons.${lessonId}`;
  
  await setDoc(progressRef, {
    [lessonPath]: {
      status: 'completed',
      masteryScore: masteryScore,
      suggestedReview: suggestedReview || null, // Ensure it's null if undefined
      lastAttempt: new Date(),
    }
  }, { merge: true });
};

export const getUserDailyTasks = async (userId) => {
  if (!userId) return null;
  try {
    const progressRef = doc(db, `userProgress/${userId}`);
    const progressSnap = await getDoc(progressRef);
    if (progressSnap.exists()) {
      const data = progressSnap.data();
      return data.dailyTasks || { generatedAt: null, tasks: [] };
    }
    return null;
  } catch (error) {
    console.error("Error fetching user daily tasks:", error);
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

export const getLeaderboard = async () => {
  try {
    const progressQuery = query(
      collection(db, 'userProgress'), 
      orderBy('stats.points', 'desc'), 
      limit(50)
    );
    
    const progressSnapshot = await getDocs(progressQuery);
    
    if (progressSnapshot.empty) {
      return [];
    }

    const leaderboard = progressSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        points: data.stats?.points || 0,
        name: data.stats?.displayName || 'Anonymous',
        avatarUrl: data.stats?.avatarUrl || `https://ui-avatars.com/api/?name=Anonymous&background=3B82F6&color=FFFFFF&size=128`,
      };
    });

    return leaderboard;

  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return [];
  }
};
// --- ✨ [NEW] Notification Functions ---

// ✨ [NEW] Function to delete a notification
export const deleteNotification = async (userId, notificationId) => {
  if (!userId || !notificationId) return;
  const notifRef = doc(db, 'userNotifications', userId, 'inbox', notificationId);
  try {
    await deleteDoc(notifRef);
  } catch (error) {
    console.error(`Error deleting notification ${notificationId}:`, error);
  }
};
// ✨ [NEW] Function to delete multiple notifications at once
export const deleteAllNotifications = async (userId, notificationIds) => {
  if (!userId || !Array.isArray(notificationIds) || notificationIds.length === 0) return;

  const batch = writeBatch(db);
  notificationIds.forEach(id => {
    const notifRef = doc(db, 'userNotifications', userId, 'inbox', id);
    batch.delete(notifRef);
  });

  try {
    await batch.commit();
    console.log(`${notificationIds.length} notifications deleted successfully.`);
  } catch (error) {
    console.error("Error batch deleting notifications:", error);
  }
};