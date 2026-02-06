// data/ArenaTranslations.js

export const ARENA_TEXTS = {
  en: {
    // 1. Rules Screen (Protocol ARENA)
    rules: {
      title: "PROTOCOL ARENA",
      subtitle: "Strict Examination Rules in Effect",
      items: {
        app_switch: {
          title: "NO APP SWITCHING",
          desc: "Leaving the app, answering a call, or pulling the notification bar will result in immediate disqualification."
        },
        screenshot: {
          title: "NO SCREENSHOTS",
          desc: "Screen recording or capturing is detected and will terminate the session instantly."
        },
        three_sec: {
          title: "3-SECOND RULE",
          desc: "If a system dialog appears (e.g., Low Battery), you have exactly 3 seconds to dismiss it."
        },
        connection: {
          title: "STABLE CONNECTION",
          desc: "Ensure you have internet. Disconnection is treated as a tactical retreat (Failure)."
        }
      },
      disclaimer: "By proceeding, you accept the possibility of XP loss.",
      btn_retreat: "RETREAT",
      btn_accept: "I ACCEPT THE RISKS"
    },

    // 2. Lobby Screen
    lobby: {
      badge_speed: "SPEED RUN",
      badge_live: "LIVE EXAM",
      subtitle_suffix: "Seconds per Question!",
      warning_title: "WARNING",
      warning_body: "• You have {duration}s per question.\n• Wrong answers pause the clock for review.\n• Leaving the app results in failure.",
      btn_start: "START BLITZ",
      preparing: "Preparing Arena..."
    },

    // 3. Game Header & UI
    game: {
      timer_label: "SEC",
      question_label: "QUESTION",
      get_ready: "GET READY",
      xp_suffix: "XP"
    },

    // 4. Widgets (Interaction UI)
    widgets: {
      // General
      btn_submit: "CHECK ANSWER",
      btn_confirm: "CONFIRM",
      
      // MCM (Multiple Choice)
      mcm_hint: "SELECT ALL THAT APPLY",
      mcm_selected: "SELECTED",
      mcm_btn_default: "CONFIRM TARGETS",
      mcm_btn_success: "EXCELLENT!",
      mcm_btn_error: "INCORRECT",
      
      // Ordering
      ordering_hint: "LONG PRESS & DRAG TO REORDER",
      ordering_btn_default: "CONFIRM SEQUENCE",
      ordering_btn_success: "CORRECT SEQUENCE!",
      
      // Fill Blanks
      fill_bank_label: "AVAILABLE WORDS",
      fill_btn_default: "CHECK ANSWER",
      fill_btn_success: "PUZZLE SOLVED!",
      fill_btn_error: "WRONG SEQUENCE",
      
      // True/False & Yes/No
      tf_true: "TRUE",
      tf_false: "FALSE",
      yn_yes: "YES",
      yn_no: "NO"
    },

    // 5. Modals (Exit, Explanation, Timeout)
    modals: {
      // Exit Warning
      exit_title: "DESERTION WARNING",
      exit_msg: "Retreating forfeits all rewards.\nMake a choice before the timer ends!",
      btn_stay: "STAY & FIGHT",
      btn_leave: "RETREAT",
      
      // Explanation Modal
      exp_title: "SOLUTION",
      exp_label_your: "YOUR ANSWER",
      exp_label_correct: "CORRECT ANSWER",
      exp_label_sequence: "CORRECT SEQUENCE",
      exp_label_sentence: "COMPLETED SENTENCE",
      exp_label_match: "CORRECT CONNECTIONS",
      exp_explanation_title: "EXPLANATION",
      exp_timeout_val: "TIME OUT",
      btn_got_it: "GOT IT"
    },

    // 6. Result Screen
    results: {
      // Titles based on score
      title_disqualified: "DISQUALIFIED",
      title_failed: "MISSION FAILED",
      title_passed: "PASSED",
      title_excellent: "EXCELLENT",
      title_legendary: "LEGENDARY!",
      title_perfect: "PERFECT SCORE!",
      btn_retry: "RETRY MISSION",
      btn_leave: "LEAVE ARENA",
      btn_next_lesson: "NEXT LESSON",      
      btn_another_challenge: "NEW CHALLENGE", 
      // Subtitles
      sub_disqualified: "APP BACKGROUND DETECTED",
      sub_cheating: "CHEATING DETECTED",
      sub_timeout: "DECISION TIMEOUT",
      
      // Stats
      stat_accuracy: "ACCURACY",
      stat_xp: "XP GAINED",
      
      // Buttons
      btn_leave: "LEAVE",
      btn_retry: "RETRY"
    },

    // 7. Loading & Errors
    status: {
      loading_title: "ESTABLISHING UPLINK...",
      loading_sub: "Decrypting mission files...",
      error_title: "CONNECTION FAILED",
      btn_retry_connection: "RETRY CONNECTION",
      btn_return_base: "Return to Base"
    }
  },

  ar: {
    // 1. Rules Screen
    rules: {
      title: "بروتوكول أرينا",
      subtitle: "قواعد الاشتباك الصارمة قيد التنفيذ",
      items: {
        app_switch: {
          title: "ممنوع الخروج",
          desc: "مغادرة التطبيق، الرد على المكالمات، أو سحب شريط الإشعارات سيؤدي إلى الإقصاء الفوري."
        },
        screenshot: {
          title: "ممنوع التصوير",
          desc: "محاولة تصوير الشاشة أو تسجيل الفيديو سيتم كشفها وستنهي الجلسة فوراً."
        },
        three_sec: {
          title: "قاعدة الـ 3 ثواني",
          desc: "إذا ظهر تنبيه للنظام (مثل البطارية)، لديك 3 ثوانٍ فقط لإخفائه قبل الإقصاء."
        },
        connection: {
          title: "اتصال مستقر",
          desc: "تأكد من جودة الإنترنت. انقطاع الاتصال يعتبر انسحاباً تكتيكياً (فشل المهمة)."
        }
      },
      disclaimer: "بالمتابعة، أنت توافق على مخاطرة فقدان نقاط الخبرة.",
      btn_retreat: "انسحاب",
      btn_accept: "أقبل التحدي والمخاطر"
    },

    // 2. Lobby Screen
    lobby: {
      badge_speed: "سرعة قصوى",
      badge_live: "اختبار مباشر",
      subtitle_suffix: "ثوانٍ لكل سؤال!",
      warning_title: "تحذير هام",
      warning_body: "• لديك {duration} ثوانٍ لكل سؤال.\n• الإجابة الخاطئة توقف الوقت للمراجعة.\n• الخروج من التطبيق يعني الفشل.",
      btn_start: "ابدأ الهجوم",
      preparing: "جاري تجهيز الساحة..."
    },

    // 3. Game Header
    game: {
      timer_label: "ثانية",
      question_label: "السؤال",
      get_ready: "استعد",
      xp_suffix: "نقطة"
    },

    // 4. Widgets
    widgets: {
      btn_submit: "تحقق من الإجابة",
      btn_confirm: "تأكيد",
      
      mcm_hint: "اختر كل ما ينطبق",
      mcm_selected: "محدد",
      mcm_btn_default: "تأكيد الأهداف",
      mcm_btn_success: "ممتاز!",
      mcm_btn_error: "إجابة خاطئة",
      
      ordering_hint: "اضغط مطولاً واسحب للترتيب",
      ordering_btn_default: "تأكيد الترتيب",
      ordering_btn_success: "تسلسل صحيح!",
      
      fill_bank_label: "الكلمات المتاحة",
      fill_btn_default: "تحقق من الإجابة",
      fill_btn_success: "تم حل اللغز!",
      fill_btn_error: "تسلسل خاطئ",
      
      tf_true: "صح",
      tf_false: "خطأ",
      yn_yes: "نعم",
      yn_no: "لا"
    },

    // 5. Modals
    modals: {
      exit_title: "تحذير الهروب",
      exit_msg: "الانسحاب الآن يعني فقدان جميع الجوائز.\nقرر مصيرك قبل انتهاء الوقت!",
      btn_stay: "البقاء والقتال",
      btn_leave: "الانسحاب",
      
      exp_title: "الحل النموذجي",
      exp_label_your: "إجابتك",
      exp_label_correct: "الإجابة الصحيحة",
      exp_label_sequence: "الترتيب الصحيح",
      exp_label_sentence: "الجملة الكاملة",
      exp_label_match: "الروابط الصحيحة",
      exp_explanation_title: "الشرح والتحليل",
      exp_timeout_val: "انتهى الوقت",
      btn_got_it: "مفهوم"
    },

    // 6. Results
    results: {
      title_disqualified: "تم الإقصاء",
      title_failed: "فشلت المهمة",
      title_passed: "ناجح",
      title_excellent: "ممتاز",
      title_legendary: "أداء أسطوري!",
      title_perfect: "علامة كاملة!",
       btn_retry: "أعد المحاولة",
      btn_leave: "خروج",
      btn_next_lesson: "الدرس التالي",     
      btn_another_challenge: "تحدي آخر",   
      sub_disqualified: "تم رصد خروج للتطبيقات الخلفية",
      sub_cheating: "تم رصد محاولة غش",
      sub_timeout: "نفذ وقت اتخاذ القرار",
      
      stat_accuracy: "الدقة",
      stat_xp: "الخبرة المكتسبة",
      
      btn_leave: "مغادرة",
      btn_retry: "إعادة المحاولة"
    },

    // 7. Status
    status: {
      loading_title: "جاري الاتصال...",
      loading_sub: "فك تشفير ملفات المهمة...",
      error_title: "فشل الاتصال",
      btn_retry_connection: "إعادة الاتصال",
      btn_return_base: "العودة للقاعدة"
    }
  },

  fr: {
    // 1. Rules Screen
    rules: {
      title: "PROTOCOLE ARENA",
      subtitle: "Règles d'examen strictes en vigueur",
      items: {
        app_switch: {
          title: "AUCUN CHANGEMENT D'APP",
          desc: "Quitter l'application ou répondre à un appel entraînera une disqualification immédiate."
        },
        screenshot: {
          title: "PAS DE CAPTURES D'ÉCRAN",
          desc: "L'enregistrement ou la capture d'écran mettra fin à la session instantanément."
        },
        three_sec: {
          title: "RÈGLE DES 3 SECONDES",
          desc: "Si une boîte de dialogue système apparaît, vous avez 3 secondes pour la fermer."
        },
        connection: {
          title: "CONNEXION STABLE",
          desc: "Assurez-vous d'avoir internet. La déconnexion est traitée comme un échec."
        }
      },
      disclaimer: "En continuant, vous acceptez le risque de perte d'XP.",
      btn_retreat: "RETRAITE",
      btn_accept: "J'ACCEPTE LES RISQUES"
    },

    // 2. Lobby Screen
    lobby: {
      badge_speed: "SPEED RUN",
      badge_live: "EXAMEN LIVE",
      subtitle_suffix: "Secondes par Question!",
      warning_title: "ATTENTION",
      warning_body: "• Vous avez {duration}s par question.\n• Les erreurs mettent le chrono en pause.\n• Quitter l'app entraîne l'échec.",
      btn_start: "LANCER LE BLITZ",
      preparing: "Préparation de l'arène..."
    },

    // 3. Game UI
    game: {
      timer_label: "SEC",
      question_label: "QUESTION",
      get_ready: "PRÊT ?",
      xp_suffix: "XP"
    },

    // 4. Widgets
    widgets: {
      btn_submit: "VÉRIFIER",
      btn_confirm: "CONFIRMER",
      
      mcm_hint: "SÉLECTIONNEZ TOUT CE QUI S'APPLIQUE",
      mcm_selected: "SÉLECTIONNÉ",
      mcm_btn_default: "CONFIRMER CIBLES",
      mcm_btn_success: "EXCELLENT !",
      mcm_btn_error: "INCORRECT",
      
      ordering_hint: "MAINTENIR & GLISSER POUR ORDONNER",
      ordering_btn_default: "CONFIRMER SÉQUENCE",
      ordering_btn_success: "SÉQUENCE CORRECTE !",
      
      fill_bank_label: "MOTS DISPONIBLES",
      fill_btn_default: "VÉRIFIER RÉPONSE",
      fill_btn_success: "PUZZLE RÉSOLU !",
      fill_btn_error: "SÉQUENCE INCORRECTE",
      
      tf_true: "VRAI",
      tf_false: "FAUX",
      yn_yes: "OUI",
      yn_no: "NON"
    },

    // 5. Modals
    modals: {
      exit_title: "ALERTE DÉSERTION",
      exit_msg: "Battre en retraite annule toutes les récompenses.\nFaites un choix avant la fin du chrono !",
      btn_stay: "RESTER & COMBATTRE",
      btn_leave: "BATTRE EN RETRAITE",
      
      exp_title: "SOLUTION",
      exp_label_your: "VOTRE RÉPONSE",
      exp_label_correct: "RÉPONSE CORRECTE",
      exp_label_sequence: "SÉQUENCE CORRECTE",
      exp_label_sentence: "PHRASE COMPLÈTE",
      exp_label_match: "CONNEXIONS CORRECTES",
      exp_explanation_title: "EXPLICATION",
      exp_timeout_val: "TEMPS ÉCOULÉ",
      btn_got_it: "COMPRIS"
    },

    // 6. Results
    results: {
      title_disqualified: "DISQUALIFIÉ",
      title_failed: "ÉCHEC MISSION",
      title_passed: "RÉUSSI",
      title_excellent: "EXCELLENT",
      title_legendary: "LÉGENDAIRE !",
      title_perfect: "SCORE PARFAIT !",
            btn_retry: "RÉESSAYER",
      btn_leave: "QUITTER",
      btn_next_lesson: "LEÇON SUIVANTE",   
      btn_another_challenge: "AUTRE DÉFI",  
      sub_disqualified: "ACTIVITÉ EN ARRIÈRE-PLAN DÉTECTÉE",
      sub_cheating: "TRICHE DÉTECTÉE",
      sub_timeout: "DÉLAI DE DÉCISION DÉPASSÉ",
      
      stat_accuracy: "PRÉCISION",
      stat_xp: "XP GAGNÉ",
      
      btn_leave: "QUITTER",
      btn_retry: "RÉESSAYER"
    },

    // 7. Status
    status: {
      loading_title: "ÉTABLISSEMENT LIAISON...",
      loading_sub: "Décryptage des fichiers...",
      error_title: "ÉCHEC CONNEXION",
      btn_retry_connection: "RÉESSAYER",
      btn_return_base: "Retour à la base"
    }
  }
};