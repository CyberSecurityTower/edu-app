import { doc, getDoc, setDoc, updateDoc, collection, getDocs, onSnapshot } from "firebase/firestore"; 
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
  const lessonSnap = await getDoc(lessonSnap);
  return lessonSnap.exists() ? lessonSnap.data() : null;
};

export const getUserProgressDocument = async (userId) => {
  if (!userId) return null;
  const progressRef = doc(db, `userProgress/${userId}`);
  const progressSnap = await getDoc(progressRef);
  return progressSnap.exists() ? progressSnap.data() : null;
};

// --- ✨ الدالة المصححة ---
export const listenToUserProgress = (userId, callback) => {
  if (!userId) {
    callback(null); // --- ✨ هذا هو السطر الذي كان مفقودًا
    return () => {}; 
  }
  const progressRef = doc(db, `userProgress/${userId}`);
  const unsubscribe = onSnapshot(progressRef, (docSnap) => {
    callback(docSnap.exists() ? docSnap.data() : {}); // أرجع كائنًا فارغًا بدلاً من null لضمان الاستقرار
  }, (error) => {
    console.error("Error listening to user progress:", error);
    callback({}); // أرجع كائنًا فارغًا عند الخطأ أيضًا
  });
  return unsubscribe;
};

export const updateLessonProgress = async (userId, pathId, subjectId, lessonId, status, totalLessonsInSubject) => {
  if (!userId || !pathId || !subjectId || !lessonId || !status) return;
  
  const progressRef = doc(db, `userProgress/${userId}`);

  const progressSnap = await getDoc(progressRef);
  if (!progressSnap.exists()) {
    await setDoc(progressRef, {});
  }

  const currentProgressData = (await getDoc(progressRef)).data() || {};
  const lessonsMap = currentProgressData?.pathProgress?.[pathId]?.subjects?.[subjectId]?.lessons || {};

  if (lessonsMap[lessonId] === status) {
    return;
  }

  const updatePayload = {
    [`pathProgress.${pathId}.subjects.${subjectId}.lessons.${lessonId}`]: status
  };

  const tempLessonsMap = { ...lessonsMap, [lessonId]: status };
  const completedCount = Object.values(tempLessonsMap).filter(s => s === 'completed').length;
  const newProgress = totalLessonsInSubject > 0 
    ? Math.round((completedCount / totalLessonsInSubject) * 100) 
    : 0;
  
  updatePayload[`pathProgress.${pathId}.subjects.${subjectId}.progress`] = newProgress;

  await updateDoc(progressRef, updatePayload);
  console.log("Lesson progress updated successfully using updateDoc.");
};