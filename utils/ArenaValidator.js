/**
 * ArenaValidator.js
 * المنطق "البحت" للتحقق من الإجابات.
 * تم التعديل لدعم النصوص المترجمة واتجاه الكتابة.
 * 
 * @param {Object} question - كائن السؤال الحالي
 * @param {any} userAnswer - إجابة المستخدم
 * @param {Object} t - كائن النصوص المترجمة (من ARENA_TEXTS[language])
 * @param {boolean} isRTL - هل اللغة الحالية من اليمين لليسار؟ (للأسهم والتنسيق)
 */

export const validateAnswer = (question, userAnswer, t, isRTL = false) => {
    let isCorrect = false;
    let userChoiceText = "";
    let correctAnswerText = "";
    
    // قيم افتراضية في حال عدم تمرير كائن الترجمة (حماية للكود)
    const safeT = t || { 
        widgets: { tf_true: "TRUE", tf_false: "FALSE", yn_yes: "YES", yn_no: "NO", fill_btn_error: "WRONG PATTERN" },
        modals: { exp_explanation_title: "Explanation" }
    };

    // 1. التحقق من صحة الإجابة
    if (userAnswer !== null && userAnswer !== undefined) {
        if (question.type === 'MCQ' || question.type === 'TRUE_FALSE' || question.type === 'YES_NO') {
            const userAnsString = String(userAnswer).trim().toLowerCase();
            const correctAnsString = String(question.correct_answer).trim().toLowerCase();
            
            // مقارنة مرنة (string/boolean)
            if (userAnsString === correctAnsString) isCorrect = true;
        } else if (question.type === 'MATCHING') {
            // في الـ Matching، المكون نفسه يرسل الإجابة الصحيحة كاملة إذا طابقت
            isCorrect = true; 
        }
    }

    // 2. تجهيز النصوص في حالة الخطأ (للشرح في الـ Modal)
    if (!isCorrect) {
        // --- حالة الاختيار من متعدد (MCQ) ---
        if (question.type === 'MCQ') {
            const selectedOption = question.options?.find(o => String(o.id) == String(userAnswer));
            userChoiceText = selectedOption ? selectedOption.text : "---"; // نص فارغ إذا لم يجاوب
            
            const correctOption = question.options?.find(o => String(o.id) == String(question.correct_answer));
            correctAnswerText = correctOption ? correctOption.text : "---";
        
        // --- حالة الصواب والخطأ (TRUE_FALSE / YES_NO) ---
        } else if (question.type === 'TRUE_FALSE' || question.type === 'YES_NO') {
            // تحويل الإجابة (true/false) إلى النص المترجم المناسب
            const getLocalizedBool = (val) => {
                const strVal = String(val).toLowerCase();
                if (question.type === 'YES_NO') {
                    return strVal === 'true' ? safeT.widgets.yn_yes : safeT.widgets.yn_no;
                }
                return strVal === 'true' ? safeT.widgets.tf_true : safeT.widgets.tf_false;
            };

            userChoiceText = getLocalizedBool(userAnswer);
            correctAnswerText = getLocalizedBool(question.correct_answer);
        
        // --- حالة التوصيل (MATCHING) ---
        } else if (question.type === 'MATCHING') {
            userChoiceText = safeT.widgets.fill_btn_error; // "تسلسل خاطئ" أو ما شابه
            
            // تنسيق الأزواج الصحيحة للعرض
            // إذا كان RTL نستخدم سهماً يتجه لليسار، وإلا لليمين
            const arrow = isRTL ? " ⬅ " : " ➔ ";
            
            correctAnswerText = question.pairs.map(p => {
                // في العربية قد نفضل عرض اليمين أولاً ثم اليسار، أو العكس حسب منطق السؤال
                // هنا سنفترض الترتيب المنطقي: العنصر الأساسي -> العنصر المقابل
                return `${p.left} ${arrow} ${p.right}`;
            }).join('\n'); 
        }
    }

    return {
        isCorrect,
        userChoiceText,
        correctAnswerText,
        // إذا لم يوجد شرح للسؤال، نستخدم نصاً احتياطياً مترجماً أو فارغاً
        explanationText: question.explanation || "" 
    };
};