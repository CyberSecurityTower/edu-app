import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  ScrollView, 
  Dimensions, 
  LayoutAnimation, 
  Platform, 
  UIManager 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

// ✅ 1. استدعاء supabase المباشر
import { supabase } from '../config/supabaseClient'; 

// Contexts
import { useAppState } from '../context/AppStateContext';
import { useLanguage } from '../context/LanguageContext';

// Services
import {
  fetchPathExams,
  getDailyQuote
} from '../services/supabaseService';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');

const CARD_WIDTH = width * 0.85; 
const SPACING = 15; 
const SNAP_INTERVAL = CARD_WIDTH + SPACING; 

let cachedQuoteData = null;

const getDaysDifference = (dateString) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const examDate = new Date(dateString);
  examDate.setHours(0, 0, 0, 0);
  const diffTime = examDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const resolveText = (data, lang) => {
  if (!data) return "";
  if (typeof data === 'string') return data;
  if (typeof data === 'object') {
    return data[lang] || data['en'] || data['fr'] || data['ar'] || "";
  }
  return "";
};

const toArabicNumerals = (n) => {
  return n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
};

export default function SmartHomeWidget({ refreshTrigger = 0 }) {
  const { user } = useAppState();
  const { language, isRTL } = useLanguage();
  const router = useRouter();

  const [activeWidgets, setActiveWidgets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [maxHeight, setMaxHeight] = useState(130);
  const [expandedId, setExpandedId] = useState(null);

  const loadSmartData = useCallback(async (isManualRefresh = false) => {
    if (!user) return;
    
    if (isManualRefresh || (!cachedQuoteData && activeWidgets.length === 0)) {
        setLoading(true);
    }

    try {
      const allPossibleWidgets = [];

      let currentSemester = 'S1'; 
      try {
        const { data: settingData } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'current_semester')
          .single();
        
        if (settingData && settingData.value) {
          currentSemester = settingData.value;
        }
      } catch (err) {
        console.warn("⚠️ Could not fetch semester, defaulting to S1");
      }

      if (user.selectedPathId) {
        const exams = await fetchPathExams(user.selectedPathId);
        
        const upcomingExam = exams
          .filter(e => {
            if (!e.exam_date) return false;
            
            const diff = getDaysDifference(e.exam_date);
            const isDateValid = diff >= 0 && diff <= 14;

            const examSubjectSemester = e.subject?.semester;
            const isSemesterValid = !examSubjectSemester || examSubjectSemester === currentSemester;

            return isDateValid && isSemesterValid;
          })
          .sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date))[0]; 

        if (upcomingExam) {
          allPossibleWidgets.push({ type: 'exam', data: upcomingExam });
        }
      }

      if (cachedQuoteData && !isManualRefresh) {
         if (cachedQuoteData.category === 'quran' || cachedQuoteData.is_quran) {
            allPossibleWidgets.push({ type: 'quran', data: cachedQuoteData });
         } else {
            allPossibleWidgets.push({ type: 'quote', data: cachedQuoteData });
         }
      } else {
         const dailyContent = await getDailyQuote();
         
         if (dailyContent) {
           if (!dailyContent.id) dailyContent.id = Math.random().toString();
           cachedQuoteData = dailyContent;
           
           if (dailyContent.category === 'quran' || dailyContent.is_quran) {
                allPossibleWidgets.push({ type: 'quran', data: dailyContent });
           } else {
                allPossibleWidgets.push({ type: 'quote', data: dailyContent });
           }
         }
      }

      setActiveWidgets(allPossibleWidgets);

    } catch (e) {
      console.error("Smart Widget Error:", e);
      if (activeWidgets.length === 0) setActiveWidgets([]);
    } finally {
      setLoading(false);
    }
  }, [user, refreshTrigger]);

  useEffect(() => {
    loadSmartData(false); 
  }, []); 

  useEffect(() => {
    if (refreshTrigger > 0) {
        loadSmartData(true); 
    }
  }, [refreshTrigger]);

  const handleCardLayout = (event) => {
    if (expandedId !== null) return; 
    const { height } = event.nativeEvent.layout;
    if (height > maxHeight + 1) {
      setMaxHeight(height);
    }
  };

  const toggleExpansion = (id) => {
    Haptics.selectionAsync();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(prev => prev === id ? null : id);
  };

  const getCardTransform = () => {
    return isRTL ? [{ scaleX: -1 }] : [];
  };

  const renderExam = (exam) => {
    const daysLeft = getDaysDifference(exam.exam_date);
    const dateStr = new Date(exam.exam_date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', day: 'numeric', month: 'short' });
    const subjectTitle = exam.subject?.title || exam.subject_name || exam.title;
    const subjectName = resolveText(subjectTitle, language);
    
    const labels = {
      ar: { title: "تنبيه امتحان 🔥", sub: daysLeft === 0 ? "اليوم!" : `باقي ${daysLeft} أيام` },
      en: { title: "Exam Alert 🔥", sub: daysLeft === 0 ? "Today!" : `${daysLeft} Days Left` },
      fr: { title: "Alerte Examen 🔥", sub: daysLeft === 0 ? "Aujourd'hui!" : `Reste ${daysLeft} jours` }
    };
    const txt = labels[language] || labels.en;

    return (
      <Pressable 
        key={`exam-${exam.id}`}
        onPress={() => {
            Haptics.selectionAsync();
            if (exam.subject_id) {
                router.push({ pathname: '/subject-details', params: { id: exam.subject_id, name: subjectName }});
            } else {
                router.push('/(tabs)/tasks');
            }
        }} 
        style={[styles.pressableArea, { transform: getCardTransform() }]}
      >
        <LinearGradient 
            colors={['#7F1D1D', '#991B1B']} 
            style={[styles.card, { minHeight: maxHeight }]} 
            onLayout={handleCardLayout}
            start={{ x: 0, y: 0 }} 
            end={{ x: 1, y: 1 }}
        >
          <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
              <FontAwesome5 name="exclamation" size={24} color="#FECACA" />
            </View>
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start', paddingHorizontal: 12 }}>
              <Text style={styles.labelRed}>{txt.title}</Text>
              <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>
                {subjectName}
              </Text>
              <Text style={[styles.subTitle, { color: '#FCA5A5' }]}>{txt.sub} • {dateStr}</Text>
            </View>
            <View style={[styles.actionButton, { marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }]}>
                <FontAwesome5 name={isRTL ? "chevron-left" : "chevron-right"} size={18} color="white" />
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    );
  };

  const renderQuran = (quranData) => {
    const isExpanded = expandedId === quranData.id;
    let arabicText = "";
    let translatedText = null;

    if (typeof quranData.content === 'object') {
        arabicText = quranData.content.ar || "";
        if (language !== 'ar') {
            translatedText = quranData.content[language] || quranData.content['en'];
        }
    } else {
        arabicText = quranData.content;
    }

    const surahName = resolveText(quranData.surah, language);
    const ayahNum = quranData.ayah_number;
    const formattedNum = language === 'ar' ? toArabicNumerals(ayahNum) : ayahNum;
    const ayahSuffix = ayahNum ? `  \uFD3F${formattedNum}\uFD3E` : '';

    return (
        <Pressable 
            key={`quran-${quranData.id}`} 
            onPress={() => toggleExpansion(quranData.id)} 
            style={[styles.pressableArea, { transform: getCardTransform() }]}
        >
          <LinearGradient 
            colors={['#065F46', '#059669']} 
            style={[styles.card, { minHeight: isExpanded ? undefined : maxHeight }]} 
            onLayout={handleCardLayout} 
            start={{ x: 0, y: 0 }} 
            end={{ x: 1, y: 1 }}
          >
            <FontAwesome5 
                name="quran" 
                size={isExpanded ? 100 : 80} 
                color="rgba(255,255,255,0.05)" 
                style={{ position: 'absolute', right: -10, bottom: -10 }} 
            />
            <View style={{ paddingHorizontal: 4, width: '100%' }}>
                <Text 
                    style={[styles.quranArabicText, { textAlign: 'center' }]} 
                    numberOfLines={isExpanded ? undefined : 3}
                    ellipsizeMode="tail"
                >
                  {arabicText}
                  <Text style={{ color: '#FCD34D', fontSize: 20 }}>{ayahSuffix}</Text>
                </Text>

                {translatedText && (
                    <Text 
                        style={[styles.quranTranslationText, { textAlign: 'center', marginTop: isExpanded ? 8 : 4 }]}
                        numberOfLines={isExpanded ? undefined : 2}
                    >
                        {translatedText}
                    </Text>
                )}

                {isExpanded && <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 10, width: '50%', alignSelf: 'center' }} />}

                <Text style={[styles.quranRef, { textAlign: 'center' }]}>
                   — {surahName} —
                </Text>

                {!isExpanded && (arabicText.length > 80 || (translatedText && translatedText.length > 50)) && (
                     <View style={{alignItems: 'center', marginTop: 5}}>
                        <FontAwesome5 name="chevron-down" size={12} color="rgba(255,255,255,0.5)" />
                     </View>
                )}
            </View>
          </LinearGradient>
        </Pressable>
    );
  };

  const renderQuote = (quote) => {
    const isExpanded = expandedId === quote.id;
    const text = resolveText(quote.content, language);
    const author = resolveText(quote.author, language);

    return (
      <Pressable 
        key={`quote-${quote.id}`} 
        onPress={() => toggleExpansion(quote.id)}
        style={[styles.pressableArea, { transform: getCardTransform() }]}
      >
        <LinearGradient 
            colors={['#581C87', '#7C3AED']} 
            style={[styles.card, { minHeight: isExpanded ? undefined : maxHeight }]} 
            onLayout={handleCardLayout} 
            start={{ x: 0, y: 0 }} 
            end={{ x: 1, y: 1 }}
        >
          <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-start' }]}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(255,255,255,0.1)', marginTop: 2 }]}>
              <FontAwesome5 name="quote-right" size={20} color="#E9D5FF" />
            </View>
            <View style={{ flex: 1, paddingHorizontal: 12 }}>
              <Text 
                style={[styles.quoteText, { textAlign: isRTL ? 'right' : 'left' }]}
                numberOfLines={isExpanded ? undefined : 4}
              >
                "{text}"
              </Text>
              <Text style={[styles.quoteAuthor, { textAlign: isRTL ? 'left' : 'right' }]}>— {author}</Text>
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    );
  };

  // ✅ تم استبدال ActivityIndicator بتأثير Skeleton المتشابك
  if (loading && activeWidgets.length === 0) {
    return (
      <View style={{ marginHorizontal: isRTL ? 25 : SPACING, marginBottom: 20 }}>
        <View 
          style={[
            styles.pressableArea, 
            { 
              height: 130, 
              backgroundColor: '#1E293B', 
              overflow: 'hidden',
              justifyContent: 'center',
              transform: getCardTransform()
            }
          ]}
        >
          {/* محتويات وهمية ثابتة للخلفية */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, opacity: 0.2 }}>
            <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: '#94A3B8' }} />
            <View style={{ marginLeft: 15, flex: 1 }}>
              <View style={{ width: '60%', height: 14, borderRadius: 4, backgroundColor: '#94A3B8', marginBottom: 10 }} />
              <View style={{ width: '80%', height: 14, borderRadius: 4, backgroundColor: '#94A3B8' }} />
            </View>
          </View>

          {/* تأثير الشعاع المتحرك (Shimmer) من أعلى اليمين إلى أسفل اليسار */}
          <MotiView
            from={{ translateX: CARD_WIDTH }}
            animate={{ translateX: -CARD_WIDTH }}
            transition={{
              type: 'timing',
              duration: 1500,
              loop: true,
              repeatReverse: false,
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: CARD_WIDTH,
              zIndex: 10,
            }}
          >
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.15)', 'transparent']}
              start={{ x: 1, y: 0 }} // بداية من أعلى اليمين
              end={{ x: 0, y: 1 }}   // نهاية في أسفل اليسار
              style={{ width: '100%', height: '100%' }}
            />
          </MotiView>
        </View>
      </View>
    );
  }

  if (activeWidgets.length === 0) return null;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 500 }}
      style={{ marginBottom: 20 }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP_INTERVAL}
        decelerationRate="fast"
        pagingEnabled={false}
        style={isRTL ? { transform: [{ scaleX: -1 }] } : {}}
        contentContainerStyle={{ 
            paddingHorizontal: SPACING,
            paddingRight: isRTL ? SPACING : 25,
            paddingLeft: isRTL ? 25 : SPACING,
            gap: SPACING,
            alignItems: 'flex-start' 
        }}
      >
        {activeWidgets.map((widget, index) => (
             <View key={`${widget.type}-${index}`}>
                {widget.type === 'exam' && renderExam(widget.data)}
                {widget.type === 'quran' && renderQuran(widget.data)}
                {widget.type === 'quote' && renderQuote(widget.data)}
             </View>
        ))}
      </ScrollView>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  pressableArea: {
    width: CARD_WIDTH,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
  },
  card: {
    borderRadius: 24,
    padding: 20,
    justifyContent: 'center',
    overflow: 'hidden' 
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  labelRed: { 
    color: '#FECACA', 
    fontSize: 11, 
    fontWeight: '800', 
    marginBottom: 6, 
    textTransform: 'uppercase', 
    letterSpacing: 0.5 
  },
  title: {
    color: 'white',
    fontSize: 19,
    fontWeight: 'bold',
    marginBottom: 6,
    lineHeight: 26,
  },
  subTitle: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.9
  },
  quranArabicText: {
    color: '#FFFFFF', 
    fontSize: 22,
    fontWeight: 'bold',
    lineHeight: 40,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto', 
  },
  quranTranslationText: {
    color: '#D1FAE5',
    fontSize: 15,
    fontStyle: 'italic',
    marginBottom: 8,
    lineHeight: 24,
    opacity: 0.95
  },
  quranRef: {
    color: '#6EE7B7',
    fontSize: 13,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 8,
  },
  quoteText: {
    color: '#F3E8FF',
    fontSize: 16,
    fontStyle: 'italic',
    lineHeight: 26,
    fontWeight: '500',
  },
  quoteAuthor: {
    color: '#D8B4FE',
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 10,
  },
});