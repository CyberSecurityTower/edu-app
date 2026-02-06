
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import { MotiView } from 'moti';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../constants/translations';

const { width } = Dimensions.get('window');

const EmptyStateLottie = ({ type = 'exams' }) => {
  const { language } = useLanguage();
  const t = translations[language];

  // تحديد النصوص بناءً على نوع التبويب (جدول أو امتحانات)
  const title = type === 'exams' ? t.noExamsTitle : t.noScheduleTitle;
  const subtitle = type === 'exams' ? t.noExamsSub : t.noScheduleSub;

  return (
    <MotiView 
      from={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'timing', duration: 800 }}
      style={styles.container}
    >
      <View style={styles.lottieContainer}>
        <LottieView
          // تأكد من أن ملف اللوتي موجود في هذا المسار
          source={require('../../assets/images/noexams.json')}
          autoPlay
          loop
          style={styles.lottie}
        />
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </MotiView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    marginTop: 40, // مسافة علوية لضبط التوسط
  },
  lottieContainer: {
    width: width * 0.7,
    height: width * 0.7,
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottie: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: '80%',
  },
});

export default EmptyStateLottie;