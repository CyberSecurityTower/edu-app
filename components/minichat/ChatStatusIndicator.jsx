import React from 'react';
import { View, Text, StyleSheet, I18nManager } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import LottieView from 'lottie-react-native';
import NeuralTypingIndicator from './NeuralTypingIndicator';

// --- مكون عام لعرض حالات التحليل والبحث ---
const ProcessingView = ({ source, text, lottieStyle }) => (
  <View style={styles.searchingContainer}>
    <LottieView
      source={source}
      autoPlay
      loop
      style={[styles.searchingLottie, lottieStyle]}
      resizeMode="contain"
    />
    
    <View style={styles.textBadge}>
      <Text style={styles.searchingText}>
        {text}
      </Text>
    </View>
  </View>
);

// --- TypingView (كما هو) ---
const TypingView = () => (
  <View style={styles.bubbleContainer}>
    <View style={styles.typingBubble}>
      <NeuralTypingIndicator />
    </View>
  </View>
);

const ChatStatusIndicator = ({ status }) => {
  // تحديد المحتوى بناءً على الحالة
  const renderContent = () => {
    switch (status) {
      case 'searching':
        return (
          <ProcessingView 
            source={require('../../assets/images/Searching.json')}
            text={I18nManager.isRTL ? "جاري البحث في المصادر..." : "Browsing the web..."}
          />
        );
      
      case 'analyzing_audio':
        return (
          <ProcessingView 
            // تأكد من وجود ملف audio_analyzing.json
            source={require('../../assets/images/audio_analyzing.json')} 
            text={I18nManager.isRTL ? "جاري تحليل الصوت..." : "Analyzing audio..."}
          />
        );

      case 'analyzing_files':
        return (
          <ProcessingView 
            // تأكد من وجود ملف files_analyzing.json
            source={require('../../assets/images/files_analyzing.json')}
            text={I18nManager.isRTL ? "جاري قراءة الملفات..." : "Reading documents..."}
          />
        );

      case 'analyzing_images':
        return (
          <ProcessingView 
            // تأكد من وجود ملف picture_analyzing.json
            source={require('../../assets/images/picture_analyzing.json')}
            text={I18nManager.isRTL ? "جاري تحليل الصور..." : "Analyzing images..."}
          />
        );

      case 'typing':
        return <TypingView />;
        
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <AnimatePresence exitBeforeEnter>
        {status && (
          <MotiView
            key={status} // تغيير المفتاح يجبر المكون على إعادة تشغيل الأنيميشن عند تغير الحالة
            from={{ opacity: 0, translateY: 10, scale: 0.95 }}
            animate={{ opacity: 1, translateY: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, translateY: -5 }}
            transition={{ type: 'timing', duration: 300 }}
            style={{ width: '100%', alignItems: 'center' }}
          >
            {renderContent()}
          </MotiView>
        )}
      </AnimatePresence>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 24,
    justifyContent: 'center',
    marginBottom: 8,
  },
  searchingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    width: '100%',
  },
  searchingLottie: {
    width: 200, 
    height: 90, // قمت بتعديل الارتفاع قليلاً ليتناسب مع مختلف اللوتيز
    marginBottom: -10,
    zIndex: 1,
  },
  textBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 2,
  },
  searchingText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
    textAlign: 'center',
  },
  bubbleContainer: {
    width: '100%',
    alignItems: 'flex-start',
    paddingLeft: 10,
    marginVertical: 2,
  },
  typingBubble: {
    backgroundColor: '#F3F4F6',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 12,
    height: 38,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default React.memo(ChatStatusIndicator);