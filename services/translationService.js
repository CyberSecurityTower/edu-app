import { Audio } from 'expo-av';
/**
 * خدمة الترجمة باستخدام Google Translate API المجاني
 */
export const translateText = async (text, targetLang) => {
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
      
      const response = await fetch(url);
      const data = await response.json();
  
      if (!data || !data[0]) throw new Error('Translation failed');
  
      // دمج الفقرات في حال كان النص طويلاً جداً
      const translatedText = data[0].map(item => item[0]).join('');
      const detectedSourceLang = data[2] || 'auto';
  
      return {
        originalText: text,
        translatedText: translatedText,
        sourceLang: detectedSourceLang,
        targetLang: targetLang
      };
  
    } catch (error) {
      console.error("Translation Error:", error);
      throw error;
    }
  };
  
  // اكتشاف النص العربي لتحديد الاتجاه التلقائي
  export const isArabicText = (text) => {
      const arabicPattern = /[\u0600-\u06FF]/;
      return arabicPattern.test(text);
  };
  
  export const getLanguageName = (code) => {
      const languages = {
          'ar': 'العربية', 'en': 'English', 'fr': 'Français',
          'es': 'Español', 'de': 'Deutsch', 'it': 'Italiano',
          'tr': 'Türkçe', 'ru': 'Русский', 'zh': '中文',
          'ja': '日本語', 'auto': 'Auto'
      };
      return languages[code?.toLowerCase()] || code?.toUpperCase();
  };
  
/**
 * دالة لتشغيل نطق النص باستخدام صوت Google Translate الطبيعي
 * @param {string} text - النص المراد نطقه
 * @param {string} lang - كود اللغة (en, ar, fr...)
 */
export const playTextToSpeech = async (text, lang) => {
    try {
        // جوجل لا يقبل نصوصاً طويلة جداً في رابط واحد (أكثر من 200 حرف تقريباً)
        // لذا نأخذ أول 200 حرف فقط كمعاينة للنطق لتجنب الخطأ، أو نستخدم Fallback
        const textSegment = text.length > 200 ? text.substring(0, 200) : text;

        // رابط API المخفي الخاص بجوجل (client=tw-ob هو السر للمجانية)
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(textSegment)}&tl=${lang}&client=tw-ob`;

        // إعداد الصوت للعمل حتى في وضع الصامت (iOS)
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true, // مهم جداً للأيفون
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
        });

        // تحميل وتشغيل الصوت
        const { sound } = await Audio.Sound.createAsync(
            { uri: url },
            { shouldPlay: true }
        );

        // إرجاع كائن الصوت للتحكم به (لإيقافه مثلاً عند الخروج)
        return sound;

    } catch (error) {
        console.error("TTS Error:", error);
        throw error;
    }
};