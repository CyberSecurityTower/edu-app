// utils/localizationHelper.js

export const getLocalizedText = (dataObj, appLanguage = 'en') => {
  // حماية: إذا كانت البيانات فارغة
  if (!dataObj) return '';
  
  // حماية: إذا كانت البيانات نصاً عادياً (للتوافق مع البيانات القديمة)
  if (typeof dataObj === 'string') return dataObj;
  
  // المنطق: هات اللغة المطلوبة، إذا لم توجد هات الإنجليزية، ثم الفرنسية، ثم أي شيء
  return dataObj[appLanguage] || dataObj['en'] || dataObj['fr'] || Object.values(dataObj)[0] || 'Unknown';
};