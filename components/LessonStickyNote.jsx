
// components/LessonStickyNote.jsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MotiView } from 'moti';
import { FontAwesome5 } from '@expo/vector-icons';

// قائمة ألوان الستيكي نوتس (مثل الصورة التي أرسلتها)
const NOTE_COLORS = [
  '#FF7EB9', // وردي
  '#7AFCFF', // سماوي
  '#FEFF9C', // أصفر
  '#FF65A3', // أحمر فاتح
  '#85E3FF'  // أزرق فاتح
];

export const LessonStickyNote = ({ note, onClose }) => {
  // اختيار لون عشوائي عند التحميل (أو يمكنك تثبيته)
  const [randomColor] = useState(() => NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)]);

  if (!note) return null;

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.5, rotate: '0deg' }}
      animate={{ opacity: 1, scale: 1, rotate: '-3deg' }} // ميلان بسيط (-3 درجات)
      transition={{ type: 'spring', damping: 12 }}
      style={[styles.container, { backgroundColor: randomColor }]}
    >
      {/* زر الإغلاق (دبوس أو علامة X) */}
      <Pressable onPress={onClose} style={styles.closeBtn}>
        <FontAwesome5 name="times" size={12} color="rgba(0,0,0,0.5)" />
      </Pressable>

      {/* نص الملاحظة */}
      <Text style={styles.noteText}>
        {note}
      </Text>

      {/* تأثير ظل الورقة (Tape effect optional) */}
      <View style={styles.tape} />
    </MotiView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute', // تموضع حر
    top: 10,              // المسافة من الأعلى (داخل المحتوى)
    left: 15,             // المسافة من اليسار
    width: 140,           // عرض صغير نسبياً
    minHeight: 100,       // ارتفاع مناسب
    padding: 15,
    paddingTop: 25,       // مساحة لزر الإغلاق
    borderRadius: 2,      // حواف حادة قليلاً لتبدو كورقة
    zIndex: 100,          // لتظهر فوق النص
    
    // تأثير الظل الواقعي
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    
    // تأثير انحناء الورقة (اختياري)
    borderBottomRightRadius: 20,
  },
  noteText: {
    color: '#1F2937', // لون نص داكن للقراءة
    fontSize: 14,
    fontFamily: 'System', // أو خط يدوي إذا توفر لديك
    fontWeight: '600',
    lineHeight: 20,
    textAlign: 'left',
  },
  closeBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    padding: 5,
    zIndex: 2,
  },
  // شريط لاصق وهمي في الأعلى (جمالي)
  tape: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    width: 40,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    transform: [{ rotate: '2deg' }],
  }
});