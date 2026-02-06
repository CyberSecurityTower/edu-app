import React from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg'; // تأكد من تثبيت react-native-svg
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; 

// --- Progress Ring Component ---
const ProgressIcon = ({ progress = 0, size = 46, iconName, isMastered }) => {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progressOffset = circumference - (progress / 100) * circumference;

  // إذا كانت المادة مكتملة، نجعل الدائرة بيضاء ناصعة بالكامل
  const strokeColor = isMastered ? 'rgba(255,255,255,0.9)' : 'white';
  const trackColor = isMastered ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)';

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={progressOffset}
          strokeLinecap="round" 
        />
      </Svg>

      <View style={{
        width: size - 10,
        height: size - 10,
        borderRadius: (size - 10) / 2,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <FontAwesome5 name={iconName || 'book-open'} size={18} color="white" />
      </View>
    </View>
  );
};

const getLessonCountString = (count, language, t) => {
  if (language === 'ar') {
    if (count === 0) return "لا توجد دروس";
    if (count === 1) return "درس واحد";
    if (count === 2) return "درسان";
    if (count >= 3 && count <= 10) return `${count} دروس`;
    return `${count} درساً`;
  }
  return t('lessonsCount', { count });
};

const SubjectCard = ({ item }) => {
  const router = useRouter();
  const { t, language, isRTL } = useLanguage(); 
  
  const subjectName = item.title || item.name || 'مادة دراسية';
  const lessonCount = item.totalLessonsCount || item.total_lessons_count || 0;
  
  // استخراج النسبة والتأكد من أنها رقم
  const rawProgress = item.progress || item.mastery_percent || 0;
  const progressPercent = Math.min(Math.max(Number(rawProgress), 0), 100);
  
  // ✅ شرط التحقق من الإتقان التام (100%)
  const isMastered = Math.round(progressPercent) === 100;

  const handlePress = () => {
    Haptics.selectionAsync();
    router.push({
      pathname: '/subject-details',
      params: { id: item.id, name: subjectName, progress: progressPercent }
    });
  };

  // ✅ الألوان: إذا مكتملة نستخدم الذهبي، وإلا نستخدم لون المادة الأصلي
  const baseColor = item.color_primary || '#3B82F6';
  
  // تدرج لوني ذهبي مشع
  const goldenGradient = ['#FFD700', '#D97706']; // Gold -> Dark Amber
  // تدرج لوني عادي (لون المادة -> لون داكن)
  const normalGradient = [baseColor, '#1E293B'];

  const shadowColor = isMastered ? '#FFD700' : baseColor;

  return (
    <Pressable 
      style={({ pressed }) => [
        styles.cardContainer, 
        { 
            width: CARD_WIDTH,
            // ✅ تأثير التوهج للظل في حالة الإتقان
            shadowColor: shadowColor,       
            shadowOffset: { width: 0, height: isMastered ? 0 : 8 }, // توهج محيطي للذهبي
            shadowOpacity: isMastered ? 0.8 : 0.5,              
            shadowRadius: isMastered ? 16 : 12,                
            elevation: isMastered ? 15 : 10,                   
            backgroundColor: isMastered ? '#FFD700' : baseColor,   
            transform: [{ scale: pressed ? 0.96 : 1 }]
        }
      ]} 
      onPress={handlePress}
    >
      <LinearGradient 
        colors={isMastered ? goldenGradient : normalGradient} 
        style={[styles.card, isMastered && styles.masteredBorder]} 
        start={{x: 0, y: 0}} 
        end={{x: 1, y: 1}}
      >
        {/* ✅ التاج الذهبي المائل */}
        {isMastered && (
          <View style={[
            styles.crownWrapper, 
            isRTL ? { left: -8 } : { right: -8 } // عكس الاتجاه حسب اللغة
          ]}>
            <FontAwesome5 
              name="crown" 
              size={28} 
              color="white" 
              style={styles.crownIcon}
            />
          </View>
        )}

        <View style={styles.topRow}>
          <ProgressIcon 
            progress={progressPercent} 
            iconName={item.icon} 
            size={50}
            isMastered={isMastered} 
          />
          
          {progressPercent > 0 && (
             <View style={[styles.percentBadge, isMastered && styles.percentBadgeGold]}>
                 <Text style={[styles.percentText, isMastered && { color: '#B45309' }]}>
                    {Math.round(progressPercent)}%
                 </Text>
             </View>
          )}
        </View>

        <View style={styles.contentContainer}>
          <Text 
            style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]} 
            numberOfLines={2}
          >
            {subjectName}
          </Text>
          
          <View style={[styles.metaContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <FontAwesome5 name="book" size={12} color="rgba(255,255,255,0.7)" />
            <Text style={[
                styles.lessonCountText, 
                isRTL ? { marginRight: 6, marginLeft: 0 } : { marginLeft: 6, marginRight: 0 }
            ]}>
              {getLessonCountString(lessonCount, language, t)}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginVertical: 10,
    marginHorizontal: 6,
    borderRadius: 24,
  },
  card: {
    borderRadius: 24,
    padding: 16,
    height: 160,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden', // مهم لقص التاج إذا خرج كثيراً، أو إزالته إذا أردت بروزه
  },
  masteredBorder: {
    borderColor: 'rgba(255,255,255,0.5)', // حدود ألمع عند الإتقان
  },
  // ✅ ستايلات التاج
  crownWrapper: {
    position: 'absolute',
    top: -4,
    zIndex: 10,
    // تدوير التاج
    transform: [{ rotate: '25deg' }],
    // تأثير ظل للتاج نفسه ليبرز عن الخلفية
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  crownIcon: {
    // يمكن إضافة خصائص إضافية هنا
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  contentContainer: {
    marginTop: 10,
  },
  cardTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'left',
    marginBottom: 8,
    lineHeight: 22,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.9,
  },
  lessonCountText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
    textAlign: 'left',
  },
  percentBadge: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  percentBadgeGold: {
    backgroundColor: 'white', // خلفية بيضاء للنص عند الإتقان
  },
  percentText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  }
});

export default SubjectCard;