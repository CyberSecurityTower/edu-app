
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Modal, ScrollView } from 'react-native';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

// --- Imports for I18n ---
import { useLanguage } from '../../context/LanguageContext';
import { ARENA_TEXTS } from '../../data/ArenaTranslations';

const { width } = Dimensions.get('window');

export const ExplanationModal = ({ visible, type, explanation, correctAnswer, userAnswer, onNext }) => {
  // 🔥 إعدادات اللغة
  const { language, isRTL } = useLanguage();
  const t = ARENA_TEXTS[language] || ARENA_TEXTS.en;

  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = 0.8;
      opacity.value = 0;
      scale.value = withSpring(1, { damping: 12, stiffness: 100 });
      opacity.value = withTiming(1, { duration: 200 });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }]
  }));

  if (!visible) return null;

  // --- 1. Standard Comparison View (MCQ, MCM, True/False) ---
  const renderStandardView = () => (
    <View style={styles.comparisonContainer}>
        {/* Your Answer Block (Wrong) */}
        <View style={[styles.choiceBox, styles.wrongBox]}>
            <Text style={[styles.choiceLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t.modals.exp_label_your}
            </Text>
            
            <Text style={[styles.choiceTextWrong, { textAlign: isRTL ? 'right' : 'left' }]}>
                {userAnswer || t.modals.exp_timeout_val}
            </Text>
            
            {/* أيقونة الخطأ */}
            <View style={[styles.xIcon, isRTL ? { left: 10 } : { right: 10 }]}>
                <FontAwesome5 name="times" size={10} color="white" />
            </View>
        </View>

        <View style={styles.arrowContainer}>
            <FontAwesome5 name="arrow-down" size={16} color="#64748B" />
        </View>

        {/* Correct Answer Block */}
        <View style={[styles.choiceBox, styles.correctBox]}>
            <Text style={[styles.choiceLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t.modals.exp_label_correct}
            </Text>
            
            <Text style={[styles.choiceTextCorrect, { textAlign: isRTL ? 'right' : 'left' }]}>
                {correctAnswer}
            </Text>
            
            {/* أيقونة الصح */}
            <View style={[styles.checkIcon, isRTL ? { left: 10 } : { right: 10 }]}>
                <FontAwesome5 name="check" size={10} color="white" />
            </View>
        </View>
    </View>
  );

  // --- 2. Ordering View (قائمة عمودية مرتبة) ---
  const renderOrderingView = () => {
    // نفترض أن النص يأتي مفصولاً بفاصل معين من دالة المساعدة
    const items = correctAnswer ? correctAnswer.split('\n⬇️\n') : [];
    return (
        <View style={styles.listContainer}>
            <Text style={[styles.choiceLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t.modals.exp_label_sequence}
            </Text>
            {items.map((item, idx) => (
                <View 
                    key={idx} 
                    style={[styles.orderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                >
                    <View style={[styles.orderIndex, isRTL ? { marginLeft: 10 } : { marginRight: 10 }]}>
                        <Text style={styles.orderIndexText}>{idx + 1}</Text>
                    </View>
                    <Text style={[styles.orderText, { textAlign: isRTL ? 'right' : 'left' }]}>
                        {item}
                    </Text>
                </View>
            ))}
        </View>
    );
  };

  // --- 3. Matching View (قائمة أزواج) ---
  const renderMatchingView = () => {
    const pairs = correctAnswer ? correctAnswer.split('\n') : [];
    return (
      <View style={styles.matchingContainer}>
         <Text style={[styles.choiceLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
             {t.modals.exp_label_match}
         </Text>
         <ScrollView style={styles.matchingList} showsVerticalScrollIndicator={false}>
            {/* 👇 التصحيح هنا: تغيير (pair, index) إلى (pairString, index) */}
            {pairs.map((pairString, index) => (
                <View 
                    key={index} 
                    style={[styles.matchingRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                >
                     <View style={[styles.dot, isRTL ? { marginLeft: 10 } : { marginRight: 10 }]} />
                    {/* الآن الاسم متطابق */}
                    <Text style={[styles.matchingText, { textAlign: isRTL ? 'right' : 'left' }]}>
                        {pairString}
                    </Text>
                </View>
            ))}
         </ScrollView>
      </View>
    );
  };

  // --- تحديد المحتوى بناءً على النوع ---
  const renderContent = () => {
      switch (type) {
          case 'ORDERING': return renderOrderingView();
          case 'MATCHING': return renderMatchingView();
          // MCQ, TRUE_FALSE, YES_NO, MCM يستخدمون العرض القياسي
          default: return renderStandardView();
      }
  };

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <View style={styles.overlay}>
        {/* خلفية معتمة */}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: opacity, backgroundColor: 'rgba(0,0,0,0.8)' }]} />
        
        {/* كارت الشرح */}
        <Animated.View style={[styles.cardContainer, animatedStyle]}>
          
          {/* Header */}
          <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
             <View style={[styles.warningIcon, isRTL ? { marginLeft: 10 } : { marginRight: 10 }]}>
                <FontAwesome5 name="lightbulb" size={18} color="#F59E0B" />
             </View>
             <Text style={styles.headerText}>{t.modals.exp_title}</Text>
          </View>

          {/* محتوى المقارنة (إجابتك vs الصحيحة) */}
          {renderContent()}

          {/* Explanation Text Box (الشرح النصي) */}
          {explanation ? (
              <View style={styles.intelBox}>
                <View style={[styles.intelHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <MaterialCommunityIcons name="school" size={18} color="#38BDF8" />
                    <Text style={styles.intelTitle}>{t.modals.exp_explanation_title}</Text>
                </View>
                <ScrollView style={{ maxHeight: 120 }} showsVerticalScrollIndicator={true}>
                    <Text style={[styles.explanationText, { textAlign: isRTL ? 'right' : 'left' }]}>
                        {explanation}
                    </Text>
                </ScrollView>
              </View>
          ) : null}

          {/* Action Button */}
          <TouchableOpacity onPress={onNext} activeOpacity={0.8}>
            <LinearGradient 
                colors={['#38BDF8', '#0284C7']} 
                start={{x: 0, y: 0}} end={{x: 1, y: 0}} 
                style={[styles.continueBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            >
                <Text style={styles.continueText}>{t.modals.btn_got_it}</Text>
                <FontAwesome5 name={isRTL ? "arrow-left" : "arrow-right"} size={14} color="white" />
            </LinearGradient>
          </TouchableOpacity>

        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cardContainer: { width: width * 0.9, backgroundColor: '#0F172A', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  
  header: { alignItems: 'center', marginBottom: 20, justifyContent: 'center' },
  warningIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(245, 158, 11, 0.2)', justifyContent: 'center', alignItems: 'center' },
  headerText: { color: 'white', fontSize: 16, fontWeight: '800', letterSpacing: 2 },

  // Labels
  choiceLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },

  // Standard/MCQ Styles
  comparisonContainer: { gap: 10, marginBottom: 20 },
  choiceBox: { padding: 12, borderRadius: 12, borderWidth: 1, position: 'relative', minHeight: 60, justifyContent:'center' },
  wrongBox: { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.4)' },
  correctBox: { backgroundColor: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.4)' },
  choiceTextWrong: { color: '#F87171', fontSize: 15, fontWeight: '600', textDecorationLine: 'line-through' },
  choiceTextCorrect: { color: '#34D399', fontSize: 16, fontWeight: '700' },
  arrowContainer: { alignItems: 'center', height: 16 },
  xIcon: { position: 'absolute', top: 12, backgroundColor: '#EF4444', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  checkIcon: { position: 'absolute', top: 12, backgroundColor: '#10B981', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },

  // Ordering Styles
  listContainer: { marginBottom: 20 },
  orderRow: { alignItems: 'center', marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 8 },
  orderIndex: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#38BDF8', justifyContent: 'center', alignItems: 'center' },
  orderIndexText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  orderText: { color: 'white', fontSize: 14, flex: 1 },

  // Matching Styles
  matchingContainer: { marginBottom: 20 },
  matchingList: { maxHeight: 150, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 10 },
  matchingRow: { alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  matchingText: { color: '#E2E8F0', fontSize: 13, fontWeight: '600' },

  // Intel/Explanation Box
  intelBox: { backgroundColor: 'rgba(56, 189, 248, 0.1)', borderRadius: 16, padding: 16, marginBottom: 20 },
  intelHeader: { alignItems: 'center', marginBottom: 8, gap: 8 },
  intelTitle: { color: '#38BDF8', fontSize: 12, fontWeight: '700' },
  explanationText: { color: '#E2E8F0', fontSize: 14, lineHeight: 22 },

  // Button
  continueBtn: { justifyContent: 'center', alignItems: 'center', gap: 10, paddingVertical: 14, borderRadius: 14 },
  continueText: { color: 'white', fontWeight: '800', fontSize: 14 }
});