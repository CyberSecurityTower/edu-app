
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, Pressable, StyleSheet, LayoutAnimation, Platform, UIManager 
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { ZoomIn, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { SoundManager } from '../../utils/SoundManager';
import { useLanguage } from '../../context/LanguageContext';

// تفعيل الأنيميشن للأندرويد
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// 🎨 لوحة ألوان للأزواج المتطابقة (Cyberpunk Palette)
const PAIR_COLORS = [
    ['#F472B6', '#DB2777'], // Pink
    ['#38BDF8', '#0284C7'], // Blue
    ['#A78BFA', '#7C3AED'], // Purple
    ['#34D399', '#059669'], // Green
    ['#FBBF24', '#D97706'], // Amber
];

export const MatchingWidget = ({ question, onAnswer, onUpdate, onStopTimer }) => {
  const { isRTL } = useLanguage();

  const [leftItems, setLeftItems] = useState([]);
  const [rightItems, setRightItems] = useState([]);
  
  const [selectedLeft, setSelectedLeft] = useState(null);
  
  // تخزين التوصيلات مع لون كل زوج: { leftId: { rightId: '...', colorIndex: 0 } }
  const [connections, setConnections] = useState({});
  const [submitted, setSubmitted] = useState(false);

  // إعداد البيانات عند التحميل
  useEffect(() => {
    if (question.left_items && question.right_items) {
        setLeftItems([...question.left_items].sort(() => Math.random() - 0.5));
        setRightItems([...question.right_items].sort(() => Math.random() - 0.5));
    } else {
        setLeftItems([]);
        setRightItems([]);
    }
    setConnections({});
    setSelectedLeft(null);
    setSubmitted(false);
  }, [question]);

  // --- Logic ---

  // 1. التعامل مع القائمة اليسرى
  const handleLeftPress = (item) => {
    if (submitted) return;
    configureAnimation();

    // أ) إذا كان العنصر موصلاً بالفعل -> نفك التوصيل (Undo)
    if (connections[item.id]) {
        SoundManager.playSound('click');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
        const newConnections = { ...connections };
        delete newConnections[item.id];
        setConnections(newConnections);
        return;
    }

    // ب) تحديد العنصر الجديد
    SoundManager.playSound('click'); 
    setSelectedLeft(item.id === selectedLeft ? null : item.id);
  };

  // 2. التعامل مع القائمة اليمنى
  const handleRightPress = (item) => {
    if (submitted) return;
    
    // هل العنصر الأيمن مستخدم بالفعل؟
    const isRightUsed = Object.values(connections).some(conn => conn.rightId === item.id);
    
    // أ) إذا كان مستخدماً -> نفك التوصيل (Undo)
    if (isRightUsed) {
        configureAnimation();
        SoundManager.playSound('click');
        const leftIdKey = Object.keys(connections).find(key => connections[key].rightId === item.id);
        if (leftIdKey) {
            const newConnections = { ...connections };
            delete newConnections[leftIdKey];
            setConnections(newConnections);
        }
        return;
    }

    // ب) إذا لم يكن هناك عنصر أيسر محدد -> لا نفعل شيئاً
    if (!selectedLeft) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
    }

    // ج) إتمام التوصيل
    configureAnimation();
    SoundManager.playSound('pop'); 
    Haptics.selectionAsync();

    // اختيار لون للزوج بناءً على ترتيبه
    const usedColorsCount = Object.keys(connections).length;
    const colorIndex = usedColorsCount % PAIR_COLORS.length;

    const newConnections = { 
        ...connections, 
        [selectedLeft]: { rightId: item.id, colorIndex } 
    };
    
    setConnections(newConnections);
    setSelectedLeft(null);

    // تحديث الإجابة المؤقتة (للأغراض الإحصائية فقط)
    const simpleMatches = {};
    Object.keys(newConnections).forEach(k => simpleMatches[k] = newConnections[k].rightId);
    if (onUpdate) onUpdate(simpleMatches);
  };

  // 3. مراقبة الاكتمال
  useEffect(() => {
    const totalRequired = question.left_items ? question.left_items.length : 0;
    const currentMatchesCount = Object.keys(connections).length;

    if (totalRequired > 0 && currentMatchesCount === totalRequired && !submitted) {
        if (onStopTimer) onStopTimer();
        setSubmitted(true);
        
        // إعداد الإجابة النهائية بصيغة بسيطة { leftId: rightId }
        const finalMatches = {};
        Object.keys(connections).forEach(key => {
            finalMatches[key] = connections[key].rightId;
        });

        // 🔥 تأخير بسيط جداً لرؤية النتيجة النهائية قبل الانتقال
        setTimeout(() => {
            onAnswer(finalMatches);
        }, 600);
    }
  }, [connections, question]);

  // Helper for Layout Animation
  const configureAnimation = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  // --- Rendering Helpers ---

  // دالة لجلب حالة العنصر الأيسر
  const getLeftStatus = (id) => {
      if (connections[id]) return { status: 'matched', colorIdx: connections[id].colorIndex };
      if (selectedLeft === id) return { status: 'selected', colorIdx: null };
      return { status: 'idle', colorIdx: null };
  };

  // دالة لجلب حالة العنصر الأيمن
  const getRightStatus = (id) => {
      const conn = Object.values(connections).find(c => c.rightId === id);
      if (conn) return { status: 'matched', colorIdx: conn.colorIndex };
      return { status: 'idle', colorIdx: null };
  };

  return (
    <View style={[styles.container, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      
      {/* Left Column */}
      <View style={styles.column}>
        {leftItems.map((item, index) => {
          const { status, colorIdx } = getLeftStatus(item.id);
          const colors = status === 'matched' ? PAIR_COLORS[colorIdx] : 
                         status === 'selected' ? ['#38BDF8', '#0284C7'] : 
                         ['rgba(30, 41, 59, 0.6)', 'rgba(15, 23, 42, 0.6)'];

          return (
            <Animated.View key={`L-${item.id}`} entering={ZoomIn.delay(index * 50)}>
                <Pressable
                  onPress={() => handleLeftPress(item)}
                  style={({pressed}) => [
                    styles.itemBox,
                    status === 'selected' && styles.boxSelected,
                    status === 'matched' && styles.boxMatched,
                    pressed && !submitted && { transform: [{scale: 0.98}] }
                  ]}
                >
                  <LinearGradient
                    colors={colors}
                    start={{x: 0, y: 0}} end={{x: 1, y: 0}}
                    style={styles.gradientBg}
                  >
                      {status === 'matched' && (
                          <View style={styles.checkIcon}>
                              <MaterialCommunityIcons name="link-variant" size={14} color="white" />
                          </View>
                      )}
                      <Text style={[
                          styles.text, 
                          status !== 'idle' && styles.textActive,
                          { writingDirection: isRTL ? 'rtl' : 'ltr' }
                      ]}>
                          {item.text}
                      </Text>
                  </LinearGradient>
                </Pressable>
            </Animated.View>
          );
        })}
      </View>

      {/* Center Spacer / Connector Visuals */}
      <View style={styles.centerSpacer}>
          <View style={styles.dashedLine} />
      </View>

      {/* Right Column */}
      <View style={styles.column}>
        {rightItems.map((item, index) => {
          const { status, colorIdx } = getRightStatus(item.id);
          const colors = status === 'matched' ? PAIR_COLORS[colorIdx] : 
                         ['rgba(30, 41, 59, 0.6)', 'rgba(15, 23, 42, 0.6)'];

          return (
            <Animated.View key={`R-${item.id}`} entering={ZoomIn.delay(index * 50 + 100)}>
                <Pressable
                  onPress={() => handleRightPress(item)}
                  style={({pressed}) => [
                    styles.itemBox,
                    status === 'matched' && styles.boxMatched,
                    pressed && !submitted && { transform: [{scale: 0.98}] }
                  ]}
                >
                   <LinearGradient
                    colors={colors}
                    start={{x: 0, y: 0}} end={{x: 1, y: 0}}
                    style={styles.gradientBg}
                  >
                      {status === 'matched' && (
                          <View style={styles.checkIcon}>
                              <MaterialCommunityIcons name="link-variant" size={14} color="white" />
                          </View>
                      )}
                      <Text style={[
                          styles.text, 
                          status !== 'idle' && styles.textActive,
                          { writingDirection: isRTL ? 'rtl' : 'ltr' }
                      ]}>
                          {item.text}
                      </Text>
                   </LinearGradient>
                </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      marginTop: 20,
      paddingHorizontal: 4
  },
  column: { 
      flex: 1, 
      gap: 14 
  },
  centerSpacer: {
      width: 20,
      justifyContent: 'center',
      alignItems: 'center'
  },
  dashedLine: {
      height: '80%',
      width: 1,
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderStyle: 'dashed',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)'
  },
  
  itemBox: {
    borderRadius: 14,
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)', 
    minHeight: 64, 
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3
  },
  
  boxSelected: { 
      borderColor: '#38BDF8',
      transform: [{ scale: 1.02 }],
      shadowColor: "#38BDF8",
      shadowOpacity: 0.4,
  },
  
  boxMatched: {
      borderColor: 'rgba(255,255,255,0.3)',
      borderWidth: 0 // Remove border for gradient look
  },

  gradientBg: {
      flex: 1,
      justifyContent: 'center', 
      alignItems: 'center',
      padding: 12,
  },

  checkIcon: {
      position: 'absolute',
      top: 4,
      right: 4,
      opacity: 0.6
  },

  text: { 
      color: '#94A3B8', 
      fontSize: 13, 
      textAlign: 'center', 
      fontWeight: '600',
      lineHeight: 18
  },
  textActive: { 
      color: 'white', 
      fontWeight: '800',
      textShadowColor: 'rgba(0,0,0,0.2)',
      textShadowOffset: {width: 0, height: 1},
      textShadowRadius: 2
  }
});