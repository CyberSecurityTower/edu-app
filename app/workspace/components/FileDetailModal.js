import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, Modal, TouchableOpacity, 
  Image, ScrollView, Dimensions, Pressable, TextInput, ActivityIndicator 
} from 'react-native';
import { BlurView } from 'expo-blur';
import { FontAwesome5 } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, useAnimatedStyle, withSpring, withTiming, 
  withRepeat, Easing 
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../../context/LanguageContext';
import LinkLessonModal from './LinkLessonModal'; 
import { apiService } from '../../../config/api';

const { height } = Dimensions.get('window');

const getStatusConfig = (isUpload, lang) => {
    if (isUpload) {
        return {
            label: lang === 'ar' ? 'ملفي' : lang === 'fr' ? 'Mon Fichier' : 'My File',
            colors: ['#A855F7', '#EC4899'],
            textColor: '#C084FC'
        };
    }
    return {
        label: lang === 'ar' ? 'مُقتنى' : lang === 'fr' ? 'Acquis' : 'Owned',
        colors: ['#22C55E', '#3B82F6'],
        textColor: '#4ADE80'
    };
};

// دالة مساعدة لتحديد أيقونة مناسبة بناءً على النوع
const getFileIcon = (type) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('pdf')) return 'file-pdf';
    if (t.includes('image') || t.includes('jpg') || t.includes('png')) return 'image';
    if (t.includes('video') || t.includes('mp4')) return 'video';
    if (t.includes('audio') || t.includes('mp3') || t.includes('wav')) return 'music';
    return 'file-alt';
};

// دالة لجعل نص النوع مقروءاً وجميلاً
const getDisplayType = (type) => {
    if (!type) return 'FILE';
    const t = type.toUpperCase();
    if (t.includes('PDF')) return 'PDF DOCUMENT';
    if (t.includes('IMAGE') || t.includes('JPG') || t.includes('PNG')) return 'IMAGE';
    if (t.includes('VIDEO') || t.includes('MP4')) return 'VIDEO';
    if (t.includes('AUDIO') || t.includes('MP3')) return 'AUDIO';
    return t; // fallback
};

export default function FileDetailModal({ visible, file, onClose, onAction, isDeleting }) {
  const translateY = useSharedValue(height);
  const spinValue = useSharedValue(0);
  const { t, isRTL, language } = useLanguage();
  
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 14, stiffness: 100 });
      if (file) setEditedName(file.title || file.file_name);
    } else {
      translateY.value = withTiming(height, { duration: 250 });
      setIsEditing(false);
    }
  }, [visible, file]);

  useEffect(() => {
    if (isDeleting) {
      spinValue.value = withRepeat(
        withTiming(360, { duration: 1000, easing: Easing.linear }), -1, false
      );
    } else { spinValue.value = 0; }
  }, [isDeleting]);

  const handleSaveRename = async () => {
      if (!editedName.trim() || editedName === file.title) {
          setIsEditing(false);
          return;
      }
      setIsRenaming(true);
      try {
          const res = await apiService.renameSource(file.id, editedName);
          if (res.success) {
              if (onAction) {
                  onAction('rename', { fileId: file.id, newName: editedName });
              }
              setIsEditing(false);
          }
      } catch (error) {
          console.error("Rename failed", error);
      } finally {
          setIsRenaming(false);
      }
  };
 
  const handleLink = async (lessonIds, subjectIds) => {
    try {
        if (onAction) {
            onAction('link', { fileId: file.id, lessonId: lessonIds, subjectId: subjectIds });
        }
        setLinkModalVisible(false); 
    } catch (e) {
        console.error("Linking failed", e);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spinValue.value}deg` }] }));

  if (!file) return null;

  // ✅ الإصلاح: تعريف rawType هنا قبل استخدامه
  const rawType = (file.type || file.file_type || file.mime_type || 'file');

  // استخراج البيانات
  const thumbnail = file.thumbnail_url || file.thumbnail;
  const previews = file.preview_images || file.screenshots || []; 
  const fileSize = file.file_size || file.size || 'Unknown';
  // const fileType = (file.type || file.file_type || 'file').toUpperCase(); // استبدلناها بـ rawType الأكثر دقة
  const displayDescription = file.description || file.extracted_text || file.aiSummary;
  const status = getStatusConfig(file.is_upload, language);
  
  // ✅ الآن يمكننا استخدام المتغير لأنه تم تعريفه
  const displayTypeLabel = getDisplayType(rawType);
  const iconName = getFileIcon(rawType);

  const combinedLessonIds = [...(file.lesson_ids || [])];
  if (file.lesson_id && !combinedLessonIds.includes(file.lesson_id)) {
      combinedLessonIds.push(file.lesson_id);
  }

  const combinedSubjectIds = [...(file.subject_ids || [])];
  if (file.subject_id && !combinedSubjectIds.includes(file.subject_id)) {
      combinedSubjectIds.push(file.subject_id);
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        </Pressable>
        
        <Animated.View style={[styles.modalContent, animatedStyle]}>
          <View style={styles.dragHandle} />

          <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            
             {/* HEADER SECTION */}
            <View style={[styles.headerSection, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.iconContainer}>
                {thumbnail ? (
                  <Image source={{ uri: thumbnail }} style={styles.iconImage} />
                ) : (
                  <View style={[styles.iconImage, styles.placeholderIcon]}>
                    {/* ✅ الأيقونة الآن ديناميكية */}
                    <FontAwesome5 name={iconName} size={40} color="white" />
                  </View>
                )}
              </View>

              <View style={[
                  styles.headerInfo, 
                  { 
                    alignItems: isRTL ? 'flex-end' : 'flex-start',
                    [isRTL ? 'marginRight' : 'marginLeft']: 20, 
                  }
              ]}>
                
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10, width: '100%' }}>
                    {isEditing ? (
                        <View style={{ flex: 1 }}>
                            <TextInput 
                                value={editedName}
                                onChangeText={setEditedName}
                                style={[styles.editInput, { textAlign: isRTL ? 'right' : 'left' }]}
                                autoFocus
                                selectTextOnFocus
                                onSubmitEditing={handleSaveRename}
                            />
                        </View>
                    ) : (
                        <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left', flex: 1 }]} numberOfLines={2}>
                          {file.title || file.file_name}
                        </Text>
                    )}

                    {file.is_upload && (
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            {isEditing ? (
                                <>
                                    <TouchableOpacity onPress={handleSaveRename} disabled={isRenaming} style={styles.actionIconBtn}>
                                        {isRenaming ? <ActivityIndicator size="small" color="#4ADE80" /> : <FontAwesome5 name="check" size={16} color="#4ADE80" />}
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.actionIconBtn}>
                                        <FontAwesome5 name="times" size={16} color="#EF4444" />
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.actionIconBtn}>
                                    <FontAwesome5 name="pen" size={14} color="#94A3B8" />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>

                <View style={[styles.statusIndicator, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={[styles.macDots, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <View style={[styles.dot, { backgroundColor: status.colors[0] }]} />
                        <View style={[styles.dot, { backgroundColor: status.colors[1] }]} />
                    </View>
                    <Text style={[styles.statusText, { color: status.textColor }]}>
                        {status.label}
                    </Text>
                </View>
                
                <View style={[styles.badgesRow, { flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 10 }]}>
                  <View style={styles.blueBadge}>
                      <Text style={styles.blueBadgeText}>{displayTypeLabel}</Text>
                  </View>
                  <View style={styles.greyBadge}>
                      <Text style={styles.greyBadgeText}>{fileSize}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={[styles.actionRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
             <TouchableOpacity 
                style={styles.openButton} 
                onPress={() => { 
                    onClose(); 
                    setTimeout(() => onAction('open', file), 200); 
                }}
              >
                <LinearGradient colors={['#38BDF8', '#2563EB']} style={styles.gradientButton} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <FontAwesome5 name="book-open" size={16} color="white" style={{ [isRTL ? 'marginLeft' : 'marginRight']: 10 }} />
                    <Text style={styles.primaryButtonText}>{t('openRawFile') || 'Open'}</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.linkButton} onPress={() => setLinkModalVisible(true)}>
                <FontAwesome5 name="link" size={18} color="#38BDF8" />
              </TouchableOpacity>

              <TouchableOpacity style={[styles.deleteButton, isDeleting && styles.deletingButton]} onPress={() => onAction('delete')} disabled={isDeleting}>
                <Animated.View style={isDeleting ? spinStyle : {}}>
                    <FontAwesome5 name={isDeleting ? "spinner" : "trash-alt"} size={18} color={isDeleting ? "#94A3B8" : "#FF453A"} />
                </Animated.View>
              </TouchableOpacity>
            </View>

            <View style={styles.separator} />
            
             {/* ✅ إخفاء المعاينة للملفات الصوتية لأنها لا تملك صفحات */}
             {!rawType.toLowerCase().includes('audio') && previews.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionHeader, { textAlign: isRTL ? 'right' : 'left' }]}>{t('previewReel') || 'Pages Preview'}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.reelContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      {previews.map((shot, index) => (
                          <View key={index} style={styles.reelItem}>
                          <Image source={{ uri: shot }} style={styles.reelImage} />
                          <Text style={styles.reelCaption} numberOfLines={1}>{t('page') || 'Page'} {index + 1}</Text>
                          </View>
                      ))}
                  </ScrollView>
                  <View style={styles.separator} />
                </View>
            )}

            <View style={styles.section}>
              <Text style={[styles.sectionHeader, { textAlign: isRTL ? 'right' : 'left' }]}>{t('aboutFile') || 'Description'}</Text>
              <Text style={[styles.bodyText, { textAlign: isRTL ? 'right' : 'left' }]}>
                {displayDescription || t('noAiSummary') || "No description available."}
              </Text>
            </View>

          </ScrollView>
          
        <LinkLessonModal 
            visible={linkModalVisible}
            onClose={() => setLinkModalVisible(false)}
            onLink={handleLink}
            initialLessonIds={combinedLessonIds}
            initialSubjectIds={combinedSubjectIds}
        />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#0F172A', borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '85%', paddingTop: 10 },
  dragHandle: { width: 40, height: 5, backgroundColor: '#334155', borderRadius: 10, alignSelf: 'center', marginBottom: 20, marginTop: 10 },
  headerSection: { paddingHorizontal: 24, marginBottom: 24 },
  iconImage: { width: 90, height: 90, borderRadius: 20, backgroundColor: '#1E293B' },
  placeholderIcon: { backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' },
  headerInfo: { flex: 1, justifyContent: 'center' },
  
  title: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  editInput: {
      color: 'white', fontSize: 18, fontWeight: 'bold', 
      borderBottomWidth: 1, borderBottomColor: '#38BDF8',
      paddingBottom: 2, marginBottom: 4
  },
  actionIconBtn: {
      padding: 6, backgroundColor: 'rgba(255,255,255,0.05)', 
      borderRadius: 8, justifyContent: 'center', alignItems: 'center'
  },

  statusIndicator: { alignItems: 'center', gap: 6, marginTop: 4 },
  macDots: { flexDirection: 'row', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  badgesRow: { gap: 8 },
  blueBadge: { backgroundColor: 'rgba(56, 189, 248, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.2)' },
  blueBadgeText: { color: '#38BDF8', fontSize: 11, fontWeight: '700' },
  greyBadge: { backgroundColor: '#334155', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  greyBadgeText: { color: '#CBD5E1', fontSize: 11, fontWeight: '600' },
  actionRow: { paddingHorizontal: 24, marginBottom: 24, gap: 12 },
  openButton: { flex: 1 },
  gradientButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, borderRadius: 16 },
  primaryButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  deleteButton: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(255, 69, 58, 0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 69, 58, 0.2)' },
  deletingButton: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' },
  linkButton: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(56, 189, 248, 0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.2)' },
  separator: { height: 1, backgroundColor: '#1E293B', marginHorizontal: 24, marginBottom: 24 },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', color: 'white', marginBottom: 16, paddingHorizontal: 24 },
  reelContainer: { paddingHorizontal: 24, paddingBottom: 24, gap: 12 },
  reelImage: { width: 120, height: 160, borderRadius: 12, backgroundColor: '#1E293B' },
  reelCaption: { color: '#94A3B8', fontSize: 12, textAlign: 'center', marginTop: 8 },
  bodyText: { fontSize: 15, color: '#CBD5E1', lineHeight: 24, paddingHorizontal: 24 },
  section: { marginBottom: 10 }
});