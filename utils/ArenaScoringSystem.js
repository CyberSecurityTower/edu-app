// utils/ArenaScoringSystem.js
import { ARENA_TEXTS } from '../data/ArenaTranslations';

export class ArenaScoringSystem {
  
  // دالة حساب النقاط (منطق رياضي لا يحتاج لترجمة)
  static calculateScore(question, userAnswer) {
    if (!userAnswer) return 0;

    // 1. Matching Logic
    if (question.type === 'MATCHING') {
        const correctMap = question.correct_matches;
        const userKeys = Object.keys(userAnswer);
        if (userKeys.length !== Object.keys(correctMap).length) return 0;
        for (let leftId of userKeys) {
            if (userAnswer[leftId] !== correctMap[leftId]) return 0;
        }
        return 1;
    } 
    
    // 2. MCM - Strict Scoring
    else if (question.type === 'MCM') {
        const correctArr = question.correct_answer.sort();
        const userArr = [...userAnswer].sort();
        
        if (correctArr.length !== userArr.length) return 0;
        return JSON.stringify(correctArr) === JSON.stringify(userArr) ? 1 : 0;
    }

    // 3. Ordering Logic
    else if (question.type === 'ORDERING') {
        return JSON.stringify(userAnswer) === JSON.stringify(question.correct_order) ? 1 : 0;
    }

    // 4. Fill in the Blanks
    else if (question.type === 'FILL_BLANKS') {
        return JSON.stringify(userAnswer) === JSON.stringify(question.correct_answer) ? 1 : 0;
    }

    // 5. MCQ, T/F, Y/N
    else {
        return String(userAnswer).toUpperCase() === String(question.correct_answer).toUpperCase() ? 1 : 0;
    }
  }

  /**
   * 🔥 التعديل هنا: إضافة decryptedAnswer كوسيط
   */
  static getCorrectAnswerText(q, decryptedAnswer, language = 'en') {
      const isAr = language === 'ar';
      const commaSeparator = isAr ? '، ' : ', '; 
      
      // حماية ضد القيم الفارغة
      if (!decryptedAnswer) return "---";

      // ✅ 1. ترتيب (Ordering)
      if (q.type === 'ORDERING') {
          // decryptedAnswer هو مصفوفة IDs
          if (!Array.isArray(decryptedAnswer)) return "Error";
          return decryptedAnswer
            .map(id => {
                const item = q.items.find(i => i.id === id);
                return item ? item.text : id;
            })
            .join('\n⬇️\n');
      }

      // ✅ 2. اختيار متعدد (MCM)
      if (q.type === 'MCM') {
          // decryptedAnswer هو مصفوفة IDs
          if (!Array.isArray(decryptedAnswer)) return "Error";
          return q.options
            .filter(o => decryptedAnswer.includes(o.id)) // الآن decryptedAnswer معرفة
            .map(o => o.text)
            .join(commaSeparator);
      }

      // ✅ 3. ربط (Matching)
      if (q.type === 'MATCHING') {
          return Object.entries(decryptedAnswer).map(([lId, rId]) => {
              const lText = q.left_items.find(i => i.id === lId)?.text || "---";
              const rText = q.right_items.find(i => i.id === rId)?.text || "---";
              return `${lText} ↔️ ${rText}`;
          }).join('\n');
      }

      // ✅ 4. Default (MCQ, T/F, Y/N)
      if (q.type === 'MCQ') {
          const opt = q.options?.find(o => String(o.id) === String(decryptedAnswer));
          return opt ? opt.text : decryptedAnswer;
      }

      // T/F translations
      const t = ARENA_TEXTS[language] || ARENA_TEXTS.en;
      if (q.type === 'TRUE_FALSE') {
          return String(decryptedAnswer) === 'TRUE' ? t.widgets.tf_true : t.widgets.tf_false;
      }
      if (q.type === 'YES_NO') {
          return String(decryptedAnswer) === 'TRUE' ? t.widgets.yn_yes : t.widgets.yn_no;
      }

      return String(decryptedAnswer);
  }

  // 🔥 2. تصحيح عرض إجابة المستخدم
  static getUserAnswerText(q, ans, language = 'en') {
      const t = ARENA_TEXTS[language] || ARENA_TEXTS.en;
      const isAr = language === 'ar';
      const commaSeparator = isAr ? '، ' : ', ';

      // حالة انتهاء الوقت
      if (!ans) return t.modals.exp_timeout_val;

      // ✅ 1. ترتيب (Ordering)
      if (q.type === 'ORDERING') {
          // ans هنا هو مصفوفة IDs بترتيب المستخدم
          if (Array.isArray(ans)) {
              return ans.map(id => {
                  const item = q.items.find(i => i.id === id);
                  return item ? item.text : id;
              }).join('\n⬇️\n');
          }
          return "Invalid Order Data";
      }

      // ✅ 2. اختيار متعدد (MCM)
      if (q.type === 'MCM') {
           // ans هو مصفوفة IDs
           if (Array.isArray(ans)) {
               return q.options
                 .filter(o => ans.includes(o.id))
                 .map(o => o.text)
                 .join(commaSeparator);
           }
           // في حال وصلت كسلسلة نصية (مثل الصور التي أرسلتها ["pol1"])
           if (typeof ans === 'string' && ans.startsWith('[')) {
               try {
                   const parsed = JSON.parse(ans);
                   return q.options
                    .filter(o => parsed.includes(o.id))
                    .map(o => o.text)
                    .join(commaSeparator);
               } catch(e) { return ans; }
           }
           return ans;
      }
      
      // ✅ 3. ربط (Matching)
      if (q.type === 'MATCHING') {
          if (typeof ans === 'object') {
              return Object.entries(ans).map(([lId, rId]) => {
                  const lText = q.left_items.find(i => i.id === lId)?.text || "---";
                  const rText = q.right_items.find(i => i.id === rId)?.text || "---";
                  return `${lText} ↔️ ${rText}`;
              }).join('\n');
          }
          return "Invalid Matching Data";
      }
      
      // ✅ 4. MCQ
      if (q.type === 'MCQ') {
          const selectedOption = q.options?.find(o => String(o.id) === String(ans));
          return selectedOption ? selectedOption.text : ans;
      }

      // ✅ 5. True/False
      if (q.type === 'TRUE_FALSE') {
          return String(ans) === 'TRUE' ? t.widgets.tf_true : t.widgets.tf_false;
      }
      if (q.type === 'YES_NO') {
          return String(ans) === 'YES' ? t.widgets.yn_yes : t.widgets.yn_no;
      }

      return String(ans);
  }
}