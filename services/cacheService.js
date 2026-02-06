import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV({
  id: 'edu-app-storage',
  encryptionKey: 'secure-key-here' // اختياري للحماية
});

export const CacheService = {
  // حفظ كائن كامل
  set: (key, value) => {
    storage.set(key, JSON.stringify(value));
  },
  
  // جلب كائن
  get: (key) => {
    const value = storage.getString(key);
    return value ? JSON.parse(value) : null;
  },

  // التحقق من وجود مفتاح
  has: (key) => storage.contains(key),
  
  // حذف
  delete: (key) => storage.delete(key),
  clearAll: () => storage.clearAll(),

};