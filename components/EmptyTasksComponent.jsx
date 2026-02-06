// components/EmptyTasksComponent.jsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { FontAwesome5 } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';

export default function EmptyTasksComponent({ isPostCompletion = false }) {
  const { language } = useLanguage();

  // نصوص الترجمة الداخلية
  const content = {
    empty: {
      ar: { title: "هدوء ما قبل الإنجاز 🍃", sub: "أضف مهامك الجديدة من الزر أدناه." },
      en: { title: "Quiet before the storm 🍃", sub: "Add your new tasks from the button below." }
    },
    completed: {
      ar: { title: "أنت مذهل! 🎉", sub: "لقد أنهيت كل شيء.. استمتع بوقتك." },
      en: { title: "You are amazing! 🎉", sub: "Everything is done.. Enjoy your time." }
    }
  };

  const currentText = isPostCompletion 
    ? (language === 'ar' ? content.completed.ar : content.completed.en)
    : (language === 'ar' ? content.empty.ar : content.empty.en);

  return (
    <MotiView 
      from={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'timing', duration: 600 }}
      style={styles.container}
    >
      <View style={styles.iconContainer}>
        <FontAwesome5 
          name={isPostCompletion ? "glass-cheers" : "clipboard-list"} 
          size={60} 
          color={isPostCompletion ? "#10B981" : "#475569"} 
        />
      </View>

      <Text style={styles.title}>{currentText.title}</Text>
      <Text style={styles.subtitle}>{currentText.sub}</Text>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 80, // مسافة من الأعلى
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    backgroundColor: 'rgba(30, 41, 59, 0.5)', // خلفية دائرية شفافة
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 24,
  },
});