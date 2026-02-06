
// components/index.js

// المكونات الأساسية المفصولة
export * from './LessonCharts';
export * from './InteractiveTable';
export * from './ImageSlider';
export * from './AudioPlayer';
export * from './Quote';

// المكونات الموجودة داخل LessonRichComponents
// نقوم بتصدير المكونات الفريدة فقط لتجنب التكرار مع الملفات أعلاه
export { 
  StickyNote, 
  AlertBox, 
  Timeline, 
  Spoiler 
} from '../LessonRichComponents';
export * from './LessonStickyNote'; // <--- أضف هذا السطر

// 2. تصدير المكونات المنفصلة الأخرى (تأكد من مساراتها الصحيحة)
export { default as YouTubeEmbed } from '../YouTubeEmbed';
export { default as ChatFab } from '../ChatFab';
export { default as CustomAlert } from '../CustomAlert';
export { default as AddTaskModal } from '../AddTaskBottomSheet';
export { default as MiniChat } from '../MiniChat';
export { default as StreakCelebrationModal } from '../StreakCelebrationModal';