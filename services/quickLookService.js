import { apiService } from '../config/api';

// ✅ Headers لتجنب الحظر
const API_HEADERS = {
    'User-Agent': 'QuickLookApp/3.0 (Education)',
    'Accept': 'application/json'
};

/**
 * خدمة البحث السريع (النسخة المستقرة الذكية)
 * الاستراتيجية الجديدة:
 * 1. Wikipedia (للمفاهيم والمصطلحات: Oikonomia, React, Einstein)
 * 2. Dictionary (للكلمات العادية: قواعد، منزل، Run)
 * 3. 🤖 YOUR API (للأمور المعقدة والسياقية)
 * 4. Fallback (Google/DDG)
 */

export const getQuickDefinition = async (text, langCode = 'ar', localizedStrings = {}) => {
      // تنظيف النص
  const cleanText = text.trim();
  // إزالة التشكيل للبحث العربي
  const normalizedText = cleanText.replace(/[\u064B-\u065F\u0670]/g, ''); 
  
  const wikiLang = langCode === 'ar' ? 'ar' : 'en';

  console.log(`\n🚀 [QuickLook] Searching for: "${cleanText}"`);

  // =========================================================
  // 📚 المرحلة 1: ويكيبيديا (الأقوى للمفاهيم)
  // =========================================================
  try {
    console.log('📚 [Step 1] Checking Wikipedia (Encyclopedia)...');
    const wikiRes = await fetchWikipediaSmart(normalizedText, wikiLang);
    
    if (wikiRes) {
      console.log('✅ [Success] Wikipedia:', wikiRes.title);
      return {
        type: 'definition',
        title: wikiRes.title,
        content: wikiRes.extract,
        source: 'Wikipedia',
        icon: 'wikipedia-w',
        color: '#000000',
        url: wikiRes.content_urls.mobile.page
      };
    }
  } catch (e) { console.warn('⚠️ Wiki Error:', e.message); }

  // =========================================================
  // 📖 المرحلة 2: القاموس (المنقذ للكلمات العادية)
  // =========================================================
  // هذا سيحل مشكلة كلمة "قواعد" أو "Oikonomia" ككلمة لغوية
  try {
    console.log('📖 [Step 2] Checking Dictionary (Lexicon)...');
    let dictData = null;

    // للإنجليزية نستخدم قاموس Google القوي
    if (langCode === 'en') dictData = await fetchEnglishDictionary(cleanText);
    
    // للعربية أو إذا فشل الإنجليزي، نستخدم ويكاموس
    if (!dictData) dictData = await fetchWiktionary(normalizedText, wikiLang);
    
    // محاولة ذكية للعربية: حذف "ال" التعريف
    if (!dictData && normalizedText.startsWith('ال') && langCode === 'ar') {
        console.log('   -> Trying without "AL"...');
        dictData = await fetchWiktionary(normalizedText.substring(2), wikiLang);
    }

    // محاولة ذكية للعربية: تحويل الجمع لمفرد (قواعد -> قاعدة)
    // هذه خطوة بسيطة لكن فعالة جداً
    if (!dictData && langCode === 'ar' && normalizedText.length > 4) {
         // (هنا يمكن إضافة منطق معالجة لغوية بسيط مستقبلاً)
    }

    if (dictData) {
      console.log('✅ [Success] Dictionary:', dictData.word);
      return {
        type: 'definition',
        title: dictData.word,
        content: dictData.definition,
        source: 'Dictionary',
        icon: 'book',
        color: '#059669', // أخضر
        url: null
      };
    }
  } catch (e) { console.warn('⚠️ Dict Error:', e.message); }

  // =========================================================
  // 🤖 المرحلة 3: الذكاء الاصطناعي الخاص بك (API)
  // =========================================================
  // نلجأ إليه فقط إذا فشلت المصادر المجانية السريعة
  try {
    console.log('🤖 [Step 3] Sources failed. Calling YOUR AI API...');
    
    const aiResponse = await apiService.quickSearch(cleanText, langCode === 'ar' ? 'Arabic' : 'English');
    
    if (aiResponse && aiResponse.result) {
        console.log('✅ [Success] AI API returned result.');
        return {
            type: 'definition',
            title: cleanText,
            content: aiResponse.result,
            source: 'EduAI', // اسم مساعدك
            icon: 'robot',
            color: '#8B5CF6' // بنفسجي
        };
    }
  } catch (error) {
    console.warn('⚠️ AI API Failed:', error.message);
  }

  // =========================================================
  // 🦆 المرحلة 4: الحل الأخير (DuckDuckGo Instant)
  // =========================================================
  try {
    console.log('🦆 [Step 4] DuckDuckGo Instant Fallback...');
    const ddgData = await fetchDuckDuckGoInstant(cleanText);
    if (ddgData) {
        return {
            type: 'definition',
            title: ddgData.Heading,
            content: ddgData.AbstractText,
            source: 'Web',
            icon: 'search',
            color: '#F59E0B',
            url: ddgData.AbstractURL
        };
    }
  } catch (e) {}

   // استخدام النصوص المترجمة إذا توفرت، وإلا استخدام الإنجليزية كاحتياطي
  const noDefText = localizedStrings.noDefinitionFound 
    ? `${localizedStrings.noDefinitionFound} "${cleanText}".`
    : `No quick definition for "${cleanText}".`;

  const searchTitle = localizedStrings.searchGoogle || 'Search Google';

  console.log('🏁 [Final] All failed. Showing Google Link.');
  return {
    type: 'search_link',
    title: searchTitle,
    content: noDefText,
    source: 'Google',
    icon: 'google',
    color: '#4285F4',
    url: `https://www.google.com/search?q=${encodeURIComponent(cleanText)}`
  };
};

// =========================================================
// 🛠️ Helper Functions (محسنة)
// =========================================================

const fetchWikipediaSmart = async (query, lang) => {
    // 1. بحث ذكي عن العنوان (Opensearch)
    // هذا يصحح "oikonomia" إلى المقال الصحيح في ويكيبيديا بدلاً من المجلة
    const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=1&namespace=0&format=json&origin=*`;
    const searchRes = await fetch(searchUrl, { headers: API_HEADERS });
    const searchData = await searchRes.json();

    if (!searchData[1] || searchData[1].length === 0) return null;
    const bestTitle = searchData[1][0];

    // 2. جلب الملخص
    const summaryUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(bestTitle)}`;
    const summaryRes = await fetch(summaryUrl, { headers: API_HEADERS });
    
    if (!summaryRes.ok) return null;
    const summaryData = await summaryRes.json();

    // تجاهل صفحات التوضيح (Disambiguation) لأنها لا تحتوي تعريفاً مفيداً
    if (summaryData.type === 'disambiguation') return null;

    return summaryData;
};

const fetchWiktionary = async (word, lang) => {
    const res = await fetch(`https://${lang}.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`, { headers: API_HEADERS });
    if (!res.ok) return null;
    const data = await res.json();
    
    // البحث عن أول تعريف نصي نظيف
    if (data[lang]?.[0]?.definitions?.[0]) {
        let def = data[lang][0].definitions[0].definition;
        def = def.replace(/<[^>]*>?/gm, ''); // تنظيف HTML
        return { word, definition: def };
    }
    return null;
};

const fetchEnglishDictionary = async (word) => {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data[0]?.meanings[0]?.definitions[0]) {
        return {
            word: data[0].word,
            definition: data[0].meanings[0].definitions[0].definition
        };
    }
    return null;
};

const fetchDuckDuckGoInstant = async (query) => {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url);
    const data = await res.json();
    return data.AbstractText ? data : null;
};