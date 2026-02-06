// services/fileService.js
import * as FileSystem from 'expo-file-system';

/**
 * تحويل ملف (URI) إلى كائن جاهز للباك اند (Base64 + MimeType)
 */
export const prepareFileForBackend = async (file) => {
  try {
    if (!file || !file.uri) return null;

    // قراءة الملف كـ Base64
    const base64 = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // تحديد MimeType إذا لم يكن موجوداً
    let mimeType = file.mimeType || file.type;
    
    // تصحيح MimeType للصوتيات المسجلة (غالباً M4A)
    if (file.uri.endsWith('.m4a') && (!mimeType || mimeType === 'audio')) {
      mimeType = 'audio/m4a';
    } else if (!mimeType) {
        // تخمين بسيط للامتدادات الشائعة
        const ext = file.uri.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg'].includes(ext)) mimeType = 'image/jpeg';
        else if (ext === 'png') mimeType = 'image/png';
        else if (ext === 'pdf') mimeType = 'application/pdf';
        else if (ext === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }

    return {
      data: base64,
      mime: mimeType
    };
  } catch (error) {
    console.error("Error converting file to base64:", error);
    return null;
  }
};