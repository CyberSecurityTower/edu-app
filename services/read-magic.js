const supabase = require('./supabase');

async function readFullCurriculum() {
  console.log("⏳ جاري سحب المنهج الدراسي بالكامل بطلب واحد...");
  const startTime = Date.now();

  // لاحظ الجمال في هذا الطلب: نطلب المسار، وداخله المواد، وداخلها الدروس
  const { data, error } = await supabase
    .from('educational_paths')
    .select(`
      display_name,
      institution_name,
      year_label,
      subjects (
        name,
        icon,
        color_primary,
        lessons (
          title,
          duration,
          content
        )
      )
    `)
    .eq('id', 'UAlger3_L1_ITCF'); // نحدد المسار الذي نريده

  const endTime = Date.now();

  if (error) {
    console.error("❌ حدث خطأ:", error);
    return;
  }

  // طباعة النتيجة بشكل جميل
  console.log(`✅ تم جلب البيانات في ${endTime - startTime} جزء من الثانية فقط!`);
  console.log("==========================================");
  
  // نعرض البيانات كـ JSON (هكذا سيستلمها تطبيقك Flutter/React)
  console.log(JSON.stringify(data, null, 2));
  console.log("==========================================");
  
  if (data.length > 0) {
    const firstSubject = data[0].subjects[0];
    console.log(`📌 تحليل سريع:`);
    console.log(`- الطالب يدرس في: ${data[0].institution_name}`);
    console.log(`- المادة الحالية: ${firstSubject.name}`);
    console.log(`- عدد الدروس المحملة: ${firstSubject.lessons.length}`);
    console.log(`- محتوى الدرس الأول (مقتطف): ${firstSubject.lessons[0].content.substring(0, 50)}...`);
  }
}

readFullCurriculum();