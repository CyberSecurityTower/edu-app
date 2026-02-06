// migrate-full.js
const admin = require('firebase-admin');
const supabase = require('./supabase');
const serviceAccount = require('./serviceAccountKey.json'); // مفتاح الفايربيز الخاص بك

// تهيئة الفايربيز
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

async function migrateAll() {
  console.log("🚀 بدء عملية التهجير الكبرى...");

  // 1. جلب المسارات التعليمية
  const pathsSnap = await db.collection('educationalPaths').get();
  
  for (const doc of pathsSnap.docs) {
    const data = doc.data();
    console.log(`📦 جاري نقل المسار: ${doc.id}`);

    // إدخال المسار في Supabase
    await supabase.from('educational_paths').upsert({
      id: doc.id,
      display_name: data.displayName || data.title,
      institution_name: data.institutionName,
      level: data.level,
      year_label: data.year || 'سنة جامعية'
    });

    // 2. معالجة المواد (Subjects) - كانت مصفوفة أو ماب في فايربيز
    // سنفترض أنها مخزنة في حقل 'subjects' كـ Map أو Array
    const subjects = data.subjects || {}; 
    // تحويل الـ Map إلى Array إذا لزم الأمر
    const subjectsList = Array.isArray(subjects) ? subjects : Object.values(subjects);

    for (const sub of subjectsList) {
      if (!sub.id) continue; // تخطي الفارغ

      await supabase.from('subjects').upsert({
        id: sub.id,
        path_id: doc.id,
        name: sub.name,
        icon: sub.icon,
        color_primary: sub.color ? sub.color[0] : null,
        total_lessons: sub.totalLessons
      });

      // 3. معالجة الدروس داخل المادة
      // في فايربيز، أحياناً الدروس تكون Nested وأحياناً في Collection فرعية
      // سأفترض هنا أنها في حقل 'lessons' داخل المادة (حسب صورك)
      const lessons = sub.lessons || [];
      const lessonsList = Array.isArray(lessons) ? lessons : Object.values(lessons);

      for (const lesson of lessonsList) {
        if (!lesson.id) continue;

        // قد نحتاج لجلب المحتوى الطويل من lessonsContent إذا لم يكن هنا
        // لكن سنخزن الأساسيات الآن
        await supabase.from('lessons').upsert({
          id: lesson.id,
          subject_id: sub.id,
          title: lesson.title,
          duration: lesson.duration,
          order_index: 0 // يمكن تحسينه لاحقاً
        });
      }
    }
  }
  console.log("✅ تمت عملية التهجير بنجاح!");
}

// migrateAll(); // أزل التعليق في الصباح