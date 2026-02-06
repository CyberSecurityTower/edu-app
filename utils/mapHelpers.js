import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const generateMapPoints = (lessons) => {
  const CENTER_X = width / 2;
  // قللنا المدى من 2.8 إلى 3.5 لترك مساحة للنصوص الطويلة
  const AMPLITUDE = width / 3.5; 
  const SPACING = 160; // زدنا المسافة العمودية لاستيعاب النصوص تحت الدوائر

  return lessons.map((lesson, index) => {
    // تبديل الاتجاه (مرة يمين ومرة يسار)
    const x = CENTER_X + Math.sin(index * 2.2) * AMPLITUDE; 
    const y = (index + 1) * SPACING; 
    return { ...lesson, x, y };
  });
};

export const generateCurvedPath = (points) => {
  if (points.length === 0) return '';
  // نبدأ الخط من منتصف الشاشة في الأعلى
  let path = `M ${points[0].x} ${points[0].y - 100}`; 

  // ربط النقطة الأولى
  path += ` L ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const controlPoint1X = current.x;
    const controlPoint1Y = (current.y + next.y) / 2;
    const controlPoint2X = next.x;
    const controlPoint2Y = (current.y + next.y) / 2;
    path += ` C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${next.x} ${next.y}`;
  }
  return path;
};