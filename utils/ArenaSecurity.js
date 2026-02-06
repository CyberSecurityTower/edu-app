
import CryptoJS from 'crypto-js';

const SECRET_KEY = 'x-tactical-arena-secure-key-2026';

export const ArenaSecurity = {
    decryptAnswer: (encryptedString) => {
        // حماية ضد القيم الفارغة
        if (!encryptedString || typeof encryptedString !== 'string') {
            console.warn('[ArenaSecurity] Missing or invalid encrypted string');
            return null;
        }

        try {
            const parts = encryptedString.split(':');
            if (parts.length !== 2) return null;

            const iv = CryptoJS.enc.Hex.parse(parts[0]);
            const encryptedText = CryptoJS.enc.Hex.parse(parts[1]);
            
            const decrypted = CryptoJS.AES.decrypt(
                { ciphertext: encryptedText },
                CryptoJS.enc.Utf8.parse(SECRET_KEY),
                { iv: iv }
            );
            
            const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
            if (!jsonString) return null; // فك التشفير فشل
            
            return JSON.parse(jsonString);
        } catch (e) {
            console.error("[ArenaSecurity] Decryption Error:", e);
            return null;
        }
    },

    validateAnswer: (userAnswer, encryptedServerAnswer, type) => {
        // إذا لم يكن هناك هاش مشفر، نعتبر الإجابة صحيحة مؤقتاً لتجنب توقف اللعبة (Fail Open)
        // أو يمكنك جعلها false إذا كنت تفضل الصرامة
        if (!encryptedServerAnswer) {
             console.warn('[ArenaSecurity] No hash found, skipping validation.');
             return true; 
        }

        const correctAnswer = ArenaSecurity.decryptAnswer(encryptedServerAnswer);
        if (!correctAnswer) return false;

        try {
            // MCQ, TRUE_FALSE, YES_NO
            if (['MCQ', 'TRUE_FALSE', 'YES_NO'].includes(type)) {
                return String(userAnswer).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase();
            }

            // MCM
            if (type === 'MCM') {
                if (!Array.isArray(userAnswer) || !Array.isArray(correctAnswer)) return false;
                const sortedUser = [...userAnswer].sort().join('|');
                const sortedCorrect = [...correctAnswer].sort().join('|');
                return sortedUser === sortedCorrect;
            }

            // ORDERING
            if (type === 'ORDERING') {
                return JSON.stringify(userAnswer) === JSON.stringify(correctAnswer);
            }

            // MATCHING
            if (type === 'MATCHING') {
                // التأكد من أن userAnswer و correctAnswer كائنات
                if (typeof userAnswer !== 'object' || typeof correctAnswer !== 'object') return false;
                
                const userKeys = Object.keys(userAnswer).sort();
                const correctKeys = Object.keys(correctAnswer).sort();

                if (JSON.stringify(userKeys) !== JSON.stringify(correctKeys)) return false;

                for (let key of userKeys) {
                    if (userAnswer[key] !== correctAnswer[key]) return false;
                }
                return true;
            }
        } catch (e) {
            console.error("[ArenaSecurity] Validation Error:", e);
            return false;
        }

        return false;
    },
    
    getReadableCorrectAnswer: (encryptedServerAnswer, type) => {
         const decoded = ArenaSecurity.decryptAnswer(encryptedServerAnswer);
         if (!decoded) return "N/A";

         if (type === 'ORDERING' && Array.isArray(decoded)) return decoded.join('\n⬇️\n');
         if (type === 'MATCHING' && typeof decoded === 'object') {
             return Object.entries(decoded)
                .map(([key, val]) => `${key} ↔️ ${val}`)
                .join('\n');
         }
         if (Array.isArray(decoded)) return decoded.join(', ');
         return String(decoded);
    }
};