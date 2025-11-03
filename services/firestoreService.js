// services/firestoreService.js

import { 
  doc, getDoc, setDoc, updateDoc, collection, getDocs, 
  arrayUnion, arrayRemove, increment, query, orderBy, 
  limit, where, writeBatch, addDoc, serverTimestamp, deleteDoc 
} from "firebase/firestore"; 
import { db } from '../firebase';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EDUCATIONAL_PATH_CACHE_KEY = '@educational_path_cache';

/**
 * يجلب المسار التعليمي من ذاكرة التخزين المؤقت أولاً، وإذا لم يجده، يجلبه من Firestore.
 * @param {string} pathId - The ID of the educational path.
 * @returns {object | null} The educational path data.
 */
export const getCachedEducationalPathById = async (pathId) => {
  if (!pathId) return null;

  try {
    // 1. محاولة القراءة من ذاكرة التخزين المؤقت (AsyncStorage)
    const cachedPathRaw = await AsyncStorage.getItem(`${EDUCATIONAL_PATH_CACHE_KEY}_${pathId}`);
    if (cachedPathRaw) {
      console.log(`[Cache] Loaded educational path ${pathId} from cache.`);
      return JSON.parse(cachedPathRaw);
    }

    // 2. إذا لم يكن في الذاكرة، اطلبه من Firestore
    console.log(`[Cache] Path ${pathId} not in cache. Fetching from Firestore.`);
    const pathFromDB = await getEducationalPathById(pathId); // نستدعي الدالة الأصلية
    if (pathFromDB) {
      // 3. حفظ النتيجة في الذاكرة المؤقتة للمرة القادمة
      await AsyncStorage.setItem(`${EDUCATIONAL_PATH_CACHE_KEY}_${pathId}`, JSON.stringify(pathFromDB));
    }
    return pathFromDB;

  } catch (error) {
    console.error("Error in getCachedEducationalPathById:", error);
    // في حالة حدوث خطأ، حاول القراءة من Firestore كحل أخير
    return getEducationalPathById(pathId);
  }
};

/**
 * دالة لتحديث ذاكرة التخزين المؤقت في الخلفية بهدوء.
 * @param {string} pathId - The ID of the educational path to refresh.
 */
export const refreshEducationalPathCache = async (pathId) => {
  if (!pathId) return;
  try {
    console.log(`[Cache] Silently refreshing cache for path ${pathId}...`);
    const pathFromDB = await getEducationalPathById(pathId);
    if (pathFromDB) {
      await AsyncStorage.setItem(`${EDUCATIONAL_PATH_CACHE_KEY}_${pathId}`, JSON.stringify(pathFromDB));
      console.log(`[Cache] Successfully refreshed cache for path ${pathId}.`);
    }
  } catch (error) {
    console.error("Error refreshing educational path cache:", error);
  }
};
// --- ✨ Notification Functions ---

export const sendAndDisplayNotification = async (userId, { title, message, meta }, showToast = true) => {
  if (!userId) return;
  try {
    const notificationsRef = collection(db, 'userNotifications', userId, 'inbox');
    await addDoc(notificationsRef, {
      title: title, // تم التعديل هنا ليتوافق مع _layout.jsx
      message,
      meta: meta || {}, // التأكد من وجود meta
      read: false,
      createdAt: serverTimestamp(),
    });

    if (showToast) {
      Toast.show({
        type: 'info', // تم التعديل ليتوافق مع _layout.jsx
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

export const deleteNotification = async (userId, notificationId) => {
  if (!userId || !notificationId) return;
  const notifRef = doc(db, 'userNotifications', userId, 'inbox', notificationId);
  try {
    await deleteDoc(notifRef);
  } catch (error) {
    console.error(`Error deleting notification ${notificationId}:`, error);
  }
};

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

export const getAllSubjectsForPath = async (pathId) => {
  if (!pathId) return [];
  try {
    const pathData = await getEducationalPathById(pathId);
    return pathData?.subjects || [];
  } catch (error) {
    console.error("Error fetching subjects for path:", error);
    return [];
  }
};

export const getLessonsForSubject = async (pathId, subjectId) => {
  if (!pathId || !subjectId) return [];
  try {
    const subjectData = await getSubjectDetails(pathId, subjectId);
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

// --- ✅✅✅ الدالة الجديدة والمحسّنة هنا ✅✅✅ ---
export const updateLessonProgress = async (userId, pathId, subjectId, lessonId, status, totalLessonsInSubject) => {
  if (!userId || !pathId || !subjectId || !lessonId || !status) return;

  const progressRef = doc(db, `userProgress/${userId}`);
  
  // التحسين الرئيسي: نقرأ فقط إذا كانت الحالة 'completed'
  if (status === 'completed') {
    // حالة إكمال الدرس (تتطلب قراءة + كتابة)
    const progressDoc = await getDoc(progressRef);
    const lessonsMap = progressDoc.data()?.pathProgress?.[pathId]?.subjects?.[subjectId]?.lessons || {};

    // تجنب الكتابة إذا كان الدرس مكتملًا بالفعل
    if (lessonsMap[lessonId]?.status === 'completed') return;

    const updates = {};
    const lessonStatusPath = `pathProgress.${pathId}.subjects.${subjectId}.lessons.${lessonId}.status`;
    updates[lessonStatusPath] = 'completed';

    const completedCount = Object.values(lessonsMap).filter(l => l.status === 'completed').length + 1;
    const newProgress = totalLessonsInSubject > 0 ? Math.round((completedCount / totalLessonsInSubject) * 100) : 0;
    
    const subjectProgressPath = `pathProgress.${pathId}.subjects.${subjectId}.progress`;
    updates[subjectProgressPath] = newProgress;

    await updateDoc(progressRef, updates); // عملية كتابة واحدة مجمعة

  } else if (status === 'current') {
    // حالة بدء الدرس (تتطلب كتابة فقط، بدون قراءة)
    // نستخدم setDoc مع merge لتجنب الحاجة إلى قراءة الوثيقة أولاً
    // هذا هو التحسين الأكبر لتقليل عمليات القراءة
    await setDoc(progressRef, { 
      pathProgress: { 
        [pathId]: { 
          subjects: { 
            [subjectId]: { 
              lessons: { 
                [lessonId]: { 
                  status: 'current' 
                } 
              } 
            } 
          } 
        } 
      } 
    }, { merge: true });
  }
};
// --- نهاية الدالة المحسّنة ---

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
    pathProgress: {
      [pathId]: {
        subjects: {
          [subjectId]: {
            lessons: {
              [lessonId]: {
                status: 'completed',
                masteryScore: masteryScore,
                suggestedReview: suggestedReview || null,
                lastAttempt: new Date(),
              }
            }
          }
        }
      }
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