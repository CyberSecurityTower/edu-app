// utils/tasksUtils.js

export const TASKS_TRANSLATIONS = {
  en: {
    goodMorning: "Good Morning",
    goodAfternoon: "Good Afternoon",
    goodEvening: "Good Evening",
    summary: "You completed {{completed}} of {{total}} tasks",
    completed: "Completed",
    tasks: "Tasks",
    schedule: "Schedule",
    exams: "Exams",
    today: "Today",
    nextUp: "Next Up",
    noSchedule: "No schedule available",
    noExams: "No upcoming exams 🎉",
    reviseTip: "Use this time to revise!",
    deleteCompletedTitle: "Delete Completed?",
    deleteCompletedMsg: "This will remove {{count}} tasks.",
    cancel: "Cancel",
    deleteAll: "Delete All",
    addTask: "Add Task",
    generatePlan: "Generate Plan",
    error: "Error",
    failedAddTask: "Failed to add task",
    failedDelete: "Failed to delete tasks",
    generateFailed: "Generation failed",
    greatJob: "Great Job!",
    allDoneSub: "You've crushed all your tasks for today.",
    days: "days",
    day: "day"
  },
  ar: {
    goodMorning: "صباح الخير",
    goodAfternoon: "مساء الخير",
    goodEvening: "مساء الخير",
    summary: "أنجزت {{completed}} من أصل {{total}} مهام",
    completed: "المكتملة",
    tasks: "المهام",
    schedule: "الجدول",
    exams: "الامتحانات",
    today: "اليوم",
    nextUp: "القادم",
    noSchedule: "لا يوجد جدول متاح حالياً",
    noExams: "لا توجد امتحانات قادمة 🎉",
    reviseTip: "استغل الوقت للمراجعة!",
    deleteCompletedTitle: "حذف المكتملة؟",
    deleteCompletedMsg: "سيتم حذف {{count}} مهام مكتملة.",
    cancel: "إلغاء",
    deleteAll: "حذف الكل",
    addTask: "إضافة مهمة",
    generatePlan: "توليد خطة",
    error: "خطأ",
    failedAddTask: "فشل إضافة المهمة",
    failedDelete: "فشل الحذف",
    generateFailed: "فشل التوليد",
    greatJob: "عمل رائع!",
    allDoneSub: "لقد أنهيت جميع مهامك لليوم.",
    days: "أيام",
    day: "يوم"
  },
  fr: {
    goodMorning: "Bonjour",
    goodAfternoon: "Bon après-midi",
    goodEvening: "Bonsoir",
    summary: "Vous avez terminé {{completed}} sur {{total}} tâches",
    completed: "Terminé",
    tasks: "Tâches",
    schedule: "Emploi",
    exams: "Examens",
    today: "Aujourd'hui",
    nextUp: "À suivre",
    noSchedule: "Aucun emploi du temps",
    noExams: "Pas d'examens à venir 🎉",
    reviseTip: "Profitez-en pour réviser !",
    deleteCompletedTitle: "Supprimer les terminés ?",
    deleteCompletedMsg: "Cela supprimera {{count}} tâches.",
    cancel: "Annuler",
    deleteAll: "Tout supprimer",
    addTask: "Ajouter",
    generatePlan: "Générer",
    error: "Erreur",
    failedAddTask: "Échec de l'ajout",
    failedDelete: "Échec de la suppression",
    generateFailed: "Échec de la génération",
    greatJob: "Beau travail !",
    allDoneSub: "Vous avez terminé toutes vos tâches.",
    days: "jours",
    day: "jour"
  }
};

export const calculateDuration = (start, end, lang) => {
  if (!start || !end) return '--';
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  const startTotal = startH * 60 + startM;
  const endTotal = endH * 60 + endM;
  let diff = endTotal - startTotal;
  if (diff <= 0) return '0';
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  const isAr = lang === 'ar';
  const hLabel = isAr ? 'سا' : 'h';
  const mLabel = isAr ? 'د' : 'min';
  if (hours > 0 && minutes > 0) return `${hours}${hLabel} ${minutes}${mLabel}`;
  if (hours > 0) return `${hours}${hLabel}`;
  return `${minutes}${mLabel}`;
};

export const localT = (key, lang, params = {}) => {
  const dict = TASKS_TRANSLATIONS[lang] || TASKS_TRANSLATIONS['en'];
  let text = dict[key] || TASKS_TRANSLATIONS['en'][key] || key;
  Object.keys(params).forEach(param => {
    text = text.replace(`{{${param}}}`, params[param]);
  });
  return text;
};

export const getDaysString = (days, lang) => {
  if (days === 0) return localT('today', lang) + '!';
  if (lang === 'ar') {
    if (days === 1) return 'يوم واحد';
    if (days === 2) return 'يومان';
    if (days >= 3 && days <= 10) return `${days} أيام`;
    return `${days} يوماً`;
  }
  const suffix = days > 1 ? (lang === 'fr' ? 's' : 's') : ''; 
  const word = lang === 'fr' ? 'jour' : 'day';
  return `${days} ${word}${suffix}`;
};