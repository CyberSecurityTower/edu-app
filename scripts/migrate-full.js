
'use strict';

const { createClient } = require('@supabase/supabase-js');

// ------------------------------------------------------------------
// إعدادات الاتصال (مأخوذة من البيانات التي أرسلتها)
// ------------------------------------------------------------------
const SUPABASE_URL = "https://wlghgzsgsefvwtdysqsw.supabase.co";

// ملاحظة: نستخدم SERVICE_ROLE هنا لأنه يملك صلاحيات الكتابة وتجاوز الحماية (RLS) للتهيئة
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsZ2hnenNnc2Vmdnd0ZHlzcXN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzc2NDg3NywiZXhwIjoyMDc5MzQwODc3fQ.qQeIrBoUARn1L0QS2I_JLXzdRWarxnCyiFletid0tL0";

// إنشاء اتصال مباشر
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function seed() {
  console.log('🌱 Starting Database Seed...');

  // ====================================================
  // 1. إدخال المسار التعليمي (Educational Path)
  // ====================================================
  const pathId = 'UAlger3_L1_ITCF'; // ID مميز لمسار السنة الأولى
  
  const educationalPath = {
    id: pathId,
    title: 'السنة الأولى - جذع مشترك إعلام آلي (MI)',
    subjects: [
      {
        id: 'sub_algo_1',
        title: 'الخوارزميات (Algorithmique)',
        defaultLang: 'French',
        direction: 'ltr',
        lessons: [
          { id: 'algo_01', title: 'Introduction à l\'Algorithmique', masteryScore: 0 },
          { id: 'algo_02', title: 'Les Variables et les Types', masteryScore: 0 },
          { id: 'algo_03', title: 'Les Structures Conditionnelles (If/Else)', masteryScore: 0 },
          { id: 'algo_04', title: 'Les Boucles (Loops)', masteryScore: 0 }
        ]
      },
      {
        id: 'sub_analyse_1',
        title: 'التحليل 1 (Analyse)',
        defaultLang: 'French',
        direction: 'ltr',
        lessons: [
          { id: 'ana_01', title: 'Les Nombres Réels', masteryScore: 0 },
          { id: 'ana_02', title: 'Les Suites Numériques', masteryScore: 0 }
        ]
      },
      {
        id: 'sub_structure_1',
        title: 'بنية الآلة (Structure Machine)',
        defaultLang: 'French',
        direction: 'ltr',
        lessons: [
          { id: 'str_01', title: 'Codage de l\'Information', masteryScore: 0 },
          { id: 'str_02', title: 'Algèbre de Boole', masteryScore: 0 }
        ]
      },
      {
        id: 'sub_terminologie',
        title: 'المصطلحات (Terminologie)',
        defaultLang: 'Arabic',
        direction: 'rtl',
        lessons: [
          { id: 'term_01', title: 'مصطلحات التقنية الأساسية', masteryScore: 0 }
        ]
      }
    ],
    created_at: new Date().toISOString()
  };

  const { error: pathError } = await supabase
    .from('educational_paths')
    .upsert(educationalPath);

  if (pathError) {
    console.error('❌ Error inserting path:', pathError.message);
  } else {
    console.log(`✅ Educational Path "${educationalPath.title}" inserted/updated.`);
  }

  // ====================================================
  // 2. إدخال المستخدم (المطور إسلام)
  // ====================================================
  const userId = 'user_islam_dev';

  const userProfile = {
    id: userId,
    first_name: 'Islam',
    display_name: 'Islam Developer',
    email: 'islam@eduapp.com', // إيميل افتراضي
    selected_path_id: pathId, // ربط المستخدم بالمسار أعلاه
    user_profile_data: { 
      facts: { 
        role: 'Admin', 
        dream: 'Tech Millionaire',
        age: '17',
        country: 'Algeria'
      } 
    },
    ai_discovery_missions: [
      "suggest_new_topic:algo_01|Introduction à l'Algorithmique" // مهمة أولية لبدء الدراسة
    ],
    created_at: new Date().toISOString()
  };

  const { error: userError } = await supabase
    .from('users')
    .upsert(userProfile);

  if (userError) {
    console.error('❌ Error inserting user:', userError.message);
  } else {
    console.log(`✅ User "${userProfile.display_name}" inserted/updated.`);
  }

  // ====================================================
  // 3. إدخال بيانات تقدم أولية (User Progress)
  // ====================================================
  // هذا الجدول ضروري لكي لا يحدث خطأ عند محاولة قراءة التقدم لأول مرة
  const initialProgress = {
    id: userId,
    stats: { points: 50, level: 1 },
    streak_count: 1,
    path_progress: {
        [pathId]: {
            subjects: {} // سيمتلئ لاحقاً عند الدراسة
        }
    },
    daily_tasks: {
        tasks: [
            {
                id: 'task_init_1',
                title: 'ابدأ الدرس الأول في الخوارزميات',
                type: 'new_lesson',
                status: 'pending',
                relatedLessonId: 'algo_01',
                relatedSubjectId: 'sub_algo_1'
            }
        ],
        generatedAt: new Date().toISOString()
    },
    last_login: new Date().toISOString()
  };

  const { error: progressError } = await supabase
    .from('user_progress')
    .upsert(initialProgress);

  if (progressError) {
    console.error('❌ Error inserting progress:', progressError.message);
  } else {
    console.log('✅ Initial User Progress created.');
  }

  // ====================================================
  // 4. إدخال بروفايل الذاكرة (AI Memory Profile)
  // ====================================================
  const memoryProfile = {
      id: userId,
      profile_summary: "Islam is a 17-year-old developer from Algeria. He is ambitious, wants to be a millionaire, and is the creator of this app. He prefers direct and technical answers.",
      behavioral_insights: {
          style: "Direct & Ambitious",
          motivation: 10,
          mood: "Excited"
      },
      last_updated_at: new Date().toISOString()
  };

  const { error: memoryError } = await supabase
      .from('ai_memory_profiles')
      .upsert(memoryProfile);

  if (memoryError) {
      console.error('❌ Error inserting memory profile:', memoryError.message);
  } else {
      console.log('✅ AI Memory Profile created.');
  }

  console.log('\n🏁 Seeding Complete! You can now start the server.');
  console.log(`🔑 Test User ID: ${userId}`);
}

// تشغيل الدالة
seed().catch(err => console.error('Fatal Error:', err));