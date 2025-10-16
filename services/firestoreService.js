import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from "firebase/firestore"; 
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


// --- ✨ الدالة المصححة والنهائية ✨ ---
export const updateLessonProgress = async (userId, pathId, subjectId, lessonId, status, totalLessonsInSubject) => {
  if (!userId || !pathId || !subjectId || !lessonId || !status) return;
  
  const progressRef = doc(db, `userProgress/${userId}`);

  // الخطوة 1: جلب البيانات الحالية مرة واحدة فقط
  const progressSnap = await getDoc(progressRef);
  const progressData = progressSnap.exists() ? progressSnap.data() : {};

  // الخطوة 2: تحديث البيانات محليًا
  // نستخدم ?. للوصول الآمن إلى البيانات المتداخلة
  const lessonsMap = progressData?.pathProgress?.[pathId]?.subjects?.[subjectId]?.lessons || {};
  
  // إذا كانت الحالة لم تتغير، لا تفعل شيئًا لتجنب الكتابة غير الضرورية
  if (lessonsMap[lessonId] === status) {
    console.log("Lesson status is already up-to-date. No update needed.");
    return;
  }

  lessonsMap[lessonId] = status; // تحديث حالة الدرس في الخريطة المحلية

  // الخطوة 3: بناء حمولة التحديث (Update Payload)
  // نستخدم dot notation لتحديث الحقول المتداخلة بكفاءة
  const updatePayload = {
    [`pathProgress.${pathId}.subjects.${subjectId}.lessons.${lessonId}`]: status
  };

  // إذا تم إكمال الدرس، قم بحساب النسبة المئوية الجديدة وأضفها إلى الحمولة
  if (status === 'completed' || status === 'current') {
    const completedCount = Object.values(lessonsMap).filter(s => s === 'completed').length;
    const newProgress = totalLessonsInSubject > 0 
      ? Math.round((completedCount / totalLessonsInSubject) * 100) 
      : 0;
    
    updatePayload[`pathProgress.${pathId}.subjects.${subjectId}.progress`] = newProgress;
  }

  // الخطوة 4: إرسال أمر كتابة واحد وآمن إلى Firestore
  // نستخدم setDoc مع merge: true لأنه ينشئ الحقول إذا لم تكن موجودة، وهو أكثر أمانًا من updateDoc
  await setDoc(progressRef, updatePayload, { merge: true });
  console.log("Lesson progress updated successfully with new percentage.");
};