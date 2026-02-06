import React, { useEffect } from 'react';
import { 
  View, Text, StyleSheet, Modal, TouchableOpacity, Platform, 
  ScrollView, Dimensions, Pressable 
} from 'react-native';
import { BlurView } from 'expo-blur';
import { FontAwesome5 } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, useAnimatedStyle, withSpring, withTiming 
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../../context/LanguageContext';

const { height } = Dimensions.get('window');

// توليد ارتفاعات عشوائية للموجة الصوتية الوهمية لتبدو واقعية
const WAVE_BARS = Array.from({ length: 35 }, () => Math.floor(Math.random() * 25) + 10);

export default function AudioDetailModal({ visible, file, onClose, onAction }) {
  const translateY = useSharedValue(height);
  const { t, isRTL } = useLanguage();

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 14, stiffness: 100 });
    } else {
      translateY.value = withTiming(height, { duration: 250 });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({ 
      transform: [{ translateY: translateY.value }] 
  }));

  if (!file) return null;

  // جلب النص المستخرج (Transcript) أو الوصف كبديل
  const transcript = file.extracted_text || file.description || t('noTranscriptAvailable') || "Transcript is being processed...";

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        </Pressable>
        
        <Animated.View style={[styles.modalContent, animatedStyle]}>
          <View style={styles.dragHandle} />

          {/* Header Info */}
          <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
             <View style={styles.iconBox}>
                <FontAwesome5 name="music" size={24} color="#38BDF8" />
             </View>
             <View style={[styles.titleBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                 <Text style={styles.title} numberOfLines={1}>{file.title || file.name}</Text>
                 <Text style={styles.subTitle}>
                    {t('audioFile') || 'Audio File'} • {file.file_size || 'Unknown'}
                 </Text>
             </View>
          </View>

          {/* Player Visuals (Waveform + Button) */}
          <View style={styles.playerPlaceholder}>
              {/* Waveform Visualization */}
              <View style={styles.waveformContainer}>
                  {WAVE_BARS.map((h, i) => (
                      <View 
                        key={i} 
                        style={[
                            styles.waveBar, 
                            { 
                                height: h, 
                                backgroundColor: i % 2 === 0 ? 'rgba(255,255,255,0.3)' : 'rgba(56, 189, 248, 0.5)' 
                            }
                        ]} 
                      />
                  ))}
              </View>

              {/* Play Button */}
              <TouchableOpacity 
                style={styles.bigPlayBtn} 
                onPress={() => onAction('play_audio', file)}
                activeOpacity={0.8}
              >
                  <LinearGradient 
                    colors={['#38BDF8', '#2563EB']} 
                    style={styles.playGradient}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  >
                      <FontAwesome5 name="play" size={28} color="white" style={{ marginLeft: 6 }} />
                  </LinearGradient>
              </TouchableOpacity>
          </View>

          <View style={styles.separator} />

          {/* Transcript Section */}
          <View style={{ flex: 1, paddingHorizontal: 24 }}>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
                  <FontAwesome5 name="align-left" size={14} color="#94A3B8" />
                  <Text style={styles.sectionTitle}>
                      {t('transcript') || 'Transcript / Description'}
                  </Text>
              </View>
              
              <View style={styles.transcriptContainer}>
                  <ScrollView 
                    showsVerticalScrollIndicator={true}
                    contentContainerStyle={{ paddingRight: 5 }}
                  >
                      <Text style={[styles.transcriptText, { textAlign: isRTL ? 'right' : 'left' }]}>
                          {transcript}
                      </Text>
                  </ScrollView>
              </View>
          </View>

          {/* Actions Footer */}
          <View style={[styles.footer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.deleteBtn]} 
                onPress={() => onAction('delete', file)}
              >
                  <FontAwesome5 name="trash-alt" size={16} color="#EF4444" />
                  <Text style={[styles.actionText, { color: '#EF4444' }]}>{t('delete')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionBtn, styles.linkBtn]} 
                onPress={() => onAction('link', file)}
              >
                  <FontAwesome5 name="link" size={16} color="#38BDF8" />
                  <Text style={[styles.actionText, { color: '#38BDF8' }]}>{t('linkToLesson')}</Text>
              </TouchableOpacity>
          </View>

        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { 
      flex: 1, 
      justifyContent: 'flex-end', 
      backgroundColor: 'rgba(0,0,0,0.6)' 
  },
  modalContent: { 
      backgroundColor: '#0F172A', 
      borderTopLeftRadius: 32, 
      borderTopRightRadius: 32, 
      height: '82%', 
      paddingTop: 10,
      shadowColor: "#000", 
      shadowOffset: { height: -10, width: 0 }, 
      shadowOpacity: 0.5, 
      shadowRadius: 20
  },
  dragHandle: { 
      width: 40, height: 5, 
      backgroundColor: '#334155', 
      borderRadius: 10, 
      alignSelf: 'center', 
      marginBottom: 20, marginTop: 10 
  },
  
  header: { 
      paddingHorizontal: 24, 
      marginBottom: 20, 
      alignItems: 'center', 
      gap: 15 
  },
  iconBox: { 
      width: 54, height: 54, 
      borderRadius: 18, 
      backgroundColor: 'rgba(56, 189, 248, 0.1)', 
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.2)'
  },
  titleBox: { flex: 1 },
  title: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  subTitle: { color: '#64748B', fontSize: 13, marginTop: 4, fontWeight: '500' },

  playerPlaceholder: { 
      alignItems: 'center', 
      marginBottom: 25, 
      paddingHorizontal: 24,
      justifyContent: 'center'
  },
  waveformContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      height: 40,
      width: '100%',
      marginBottom: -25, // تداخل مع الزر لجمالية أكثر
      opacity: 0.6
  },
  waveBar: {
      width: 4,
      borderRadius: 2,
  },
  bigPlayBtn: { 
      shadowColor: "#38BDF8", 
      shadowOffset: { width: 0, height: 10 }, 
      shadowOpacity: 0.5, 
      shadowRadius: 20, 
      elevation: 15,
      zIndex: 10 
  },
  playGradient: { 
      width: 72, height: 72, 
      borderRadius: 36, 
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)'
  },

  separator: { 
      height: 1, 
      backgroundColor: '#1E293B', 
      marginHorizontal: 24, 
      marginBottom: 20 
  },

  sectionTitle: { 
      color: '#94A3B8', 
      fontSize: 13, 
      fontWeight: 'bold', 
      textTransform: 'uppercase',
      letterSpacing: 1
  },
  transcriptContainer: { 
      flex: 1, 
      backgroundColor: 'rgba(30, 41, 59, 0.4)', 
      borderRadius: 20, 
      padding: 20,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)'
  },
  transcriptText: { 
      color: '#E2E8F0', 
      fontSize: 16, 
      lineHeight: 28,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' // لإعطاء طابع السكريبت
  },

  footer: { 
      padding: 24, 
      paddingBottom: 40, // لرفع الأزرار قليلاً عن الحافة السفلية
      justifyContent: 'space-between', 
      gap: 15 
  },
  actionBtn: { 
      flex: 1, 
      flexDirection: 'row', 
      alignItems: 'center', 
      justifyContent: 'center', 
      gap: 8, 
      padding: 16, 
      borderRadius: 16, 
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)'
  },
  deleteBtn: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' },
  linkBtn: { backgroundColor: 'rgba(56, 189, 248, 0.1)', borderColor: 'rgba(56, 189, 248, 0.2)' },
  actionText: { fontWeight: '700', fontSize: 14 }
});