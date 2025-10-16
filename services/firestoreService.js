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

// --- THE ROBUST FIX IS HERE ---
// هذه هي النسخة النهائية والقوية التي تعالج جميع الحالات
export const updateUserFavoriteSubject = async (userId, subjectId, isFavorite) => {
  if (!userId || !subjectId) return;
  const progressRef = doc(db, `userProgress/${userId}`);

  try {
    // 1. نحاول التحديث أولاً. هذا سينجح 99% من الوقت للمستخدمين الحاليين.
    await updateDoc(progressRef, {
      'favorites.subjects': isFavorite ? arrayUnion(subjectId) : arrayRemove(subjectId)
    });
  } catch (error) {
    // 2. إذا فشل التحديث، نتحقق من السبب.
    // إذا كان السبب هو أن المستند غير موجود (مستخدم جديد)، فإننا ننشئه.
    if (error.code === 'not-found') {
      console.log("User progress document not found, creating a new one...");
      await setDoc(progressRef, {
        favorites: {
          // بما أن هذا هو أول إجراء تفضيل، فمن المؤكد أن isFavorite ستكون true
          subjects: isFavorite ? [subjectId] : [] 
        }
      }, { merge: true }); // نستخدم merge لضمان عدم الكتابة فوق حقول أخرى إذا تم إنشاؤها بطريقة ما
    } else {
      // 3. لأي خطأ آخر، نقوم بتسجيله لتصحيحه لاحقًا.
      console.error("An unexpected error occurred while updating favorite subject:", error);
    }
  }
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
 * يبحث عن المواد حسب الاسم عبر جميع المسارات التعليمية.
 * البحث غير حساس لحالة الأحرف.
 * @param {string} searchText النص المراد البحث عنه.
 * @returns {Promise<Array<Object>>} بروميس يتم حله بمصفوفة من كائنات المواد المطابقة.
 */
export const searchSubjectsByName = async (searchText) => {
  // لا تقم بالبحث إذا كان النص فارغًا أو قصيرًا جدًا
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

      // تحقق من وجود مصفوفة المواد
      if (pathData.subjects && Array.isArray(pathData.subjects)) {
        pathData.subjects.forEach(subject => {
          // قم بإجراء المطابقة غير الحساسة لحالة الأحرف
          if (subject.name.toLowerCase().includes(normalizedSearchText)) {
            // أضف معلومات المسار الأصلية (مثل اسم الكلية) للسياق في نتائج البحث
            results.push({
              ...subject,
              faculty: pathData.displayName || 'N/A', // نفترض أن displayName هو اسم الكلية/المسار
              pathId: pathId,
            });
          }
        });
      }
    });

    return results;
  } catch (error) {
    console.error("Error searching subjects:", error);
    return []; // إرجاع مصفوفة فارغة في حالة حدوث خطأ
  }
};