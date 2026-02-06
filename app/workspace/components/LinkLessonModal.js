import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, Modal, TouchableOpacity, FlatList, StyleSheet, 
  ActivityIndicator, Dimensions, Pressable 
} from 'react-native';
import { BlurView } from 'expo-blur';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, Layout, SlideInDown } from 'react-native-reanimated';
import { apiService } from '../../../config/api'; 
import { useLanguage } from '../../../context/LanguageContext';

const { width, height } = Dimensions.get('window');

export default function LinkLessonModal({ 
    visible, onClose, onLink, 
    initialLessonIds = [], initialSubjectIds = [] 
}) {
  const { t, isRTL } = useLanguage();
  
  // --- State ---
  const [activeTab, setActiveTab] = useState('browse'); // 'browse' | 'selected'
  const [currentLevel, setCurrentLevel] = useState('subjects'); // 'subjects' | 'lessons'
  const [activeSubject, setActiveSubject] = useState(null);
  
  // Data
  const [subjects, setSubjects] = useState([]);
  const [lessonsMap, setLessonsMap] = useState({}); 
  const [loading, setLoading] = useState(false);

  // Selection Sets
  const [selectedLessonIds, setSelectedLessonIds] = useState(new Set());
  // نحتفظ ببيانات إضافية للعرض في تبويب "المختارة"
  const [selectedLessonsDetails, setSelectedLessonsDetails] = useState([]); 

  // --- Effects ---
 useEffect(() => {
    if (visible) {
      resetModal();
      // 1. تعيين الـ IDs فوراً ليظهر العداد صحيحاً
      const initialSet = new Set(initialLessonIds);
      setSelectedLessonIds(initialSet);
      
      // 2. بدء عملية جلب البيانات والتفاصيل
      hydrateInitialData(initialSet);
    }
  }, [visible, initialLessonIds]); // إضافة التبعيات الصحيحة

  // --- Hydration Logic (المنطق الجديد) ---
  const hydrateInitialData = async (initialSet) => {
    setLoading(true);
    try {
      // أ) جلب قائمة المواد
      const token = await apiService.getToken(); 
      const res = await fetch(`${apiService.BASE_URL}/subjects/mine`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const allSubjects = data.subjects || [];
      setSubjects(allSubjects);

      // ب) إذا كان هناك عناصر مختارة مسبقاً، نحتاج لجلب تفاصيلها
      if (initialSet.size > 0) {
          // خدعة ذكية: نجلب دروس كل المواد بالتوازي (Parallel) لنبحث عن الأسماء
          // (هذا أسرع من طلبها واحدة تلو الأخرى)
          const promises = allSubjects.map(sub => 
              apiService.getLessons(sub.id).then(lessons => ({ sub, lessons }))
          );
          
          const results = await Promise.all(promises);
          
          let foundDetails = [];
          
          // نمر على كل النتائج ونخزنها في الـ Cache ونبحث عن المتطابقات
          results.forEach(({ sub, lessons }) => {
              // تخزين في الماب لتسريع التصفح لاحقاً
              setLessonsMap(prev => ({ ...prev, [sub.id]: lessons }));

              // هل يوجد أي درس من هذه المادة مختار مسبقاً؟
              lessons.forEach(l => {
                  if (initialSet.has(l.id)) {
                      foundDetails.push({
                          ...l,
                          subjectName: sub.title,
                          subjectId: sub.id
                      });
                  }
              });
          });

          // تحديث قائمة التفاصيل للعرض
          setSelectedLessonsDetails(foundDetails);
      }

    } catch (e) { 
        console.error("Hydration Error:", e); 
    } finally { 
        setLoading(false); 
    }
  };

  const resetModal = () => {
      setActiveTab('browse');
      setCurrentLevel('subjects');
      setActiveSubject(null);
      setSelectedLessonsDetails([]);
  };

  // --- API ---
  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const token = await apiService.getToken(); 
      const res = await fetch(`${apiService.BASE_URL}/subjects/mine`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.subjects) {
          setSubjects(data.subjects);
          return data.subjects;
      }
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  const fetchLessons = async (subjectId) => {
    if (lessonsMap[subjectId]) return;
    setLoading(true);
    try {
        const lessonsData = await apiService.getLessons(subjectId);
        setLessonsMap(prev => ({ ...prev, [subjectId]: lessonsData }));
        
        // تحديث تفاصيل الدروس المختارة إذا كانت ضمن هذه المادة
        // هذا يساعد في عرض الأسماء في تبويب "Selected"
        updateSelectedDetails(lessonsData, subjectId);
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  const updateSelectedDetails = (lessons, subjectId) => {
      const subject = subjects.find(s => s.id === subjectId);
      const newDetails = lessons
        .filter(l => initialLessonIds.includes(l.id) || selectedLessonIds.has(l.id))
        .map(l => ({ ...l, subjectName: subject?.title, subjectId }));
      
      setSelectedLessonsDetails(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const uniqueNew = newDetails.filter(n => !existingIds.has(n.id));
          return [...prev, ...uniqueNew];
      });
  };

  // --- Handlers ---
  const handleSubjectPress = async (subject) => {
    setActiveSubject(subject);
    setCurrentLevel('lessons');
    await fetchLessons(subject.id);
  };

  const toggleLesson = (lesson, subject) => {
    const newSet = new Set(selectedLessonIds);
    let newDetails = [...selectedLessonsDetails];

    if (newSet.has(lesson.id)) {
        // Remove
        newSet.delete(lesson.id);
        newDetails = newDetails.filter(d => d.id !== lesson.id);
    } else {
        // Add
        newSet.add(lesson.id);
        newDetails.push({ ...lesson, subjectName: subject.title, subjectId: subject.id });
    }
    
    setSelectedLessonIds(newSet);
    setSelectedLessonsDetails(newDetails);
  };

  const handleConfirm = () => {
      // استخراج Subject IDs من التفاصيل
      const subjectIds = new Set(selectedLessonsDetails.map(d => d.subjectId));
      onLink(Array.from(selectedLessonIds), Array.from(subjectIds));
      onClose();
  };

  // --- Renderers ---
  const renderHeader = () => (
      <View style={styles.header}>
          <View style={styles.tabsContainer}>
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'browse' && styles.activeTab]}
                onPress={() => setActiveTab('browse')}
              >
                  <Text style={[styles.tabText, activeTab === 'browse' && styles.activeTabText]}>
                      {t('browse') || 'Browse'}
                  </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'selected' && styles.activeTab]}
                onPress={() => setActiveTab('selected')}
              >
                  <Text style={[styles.tabText, activeTab === 'selected' && styles.activeTabText]}>
                      {t('selected') || 'Selected'}  
                      {selectedLessonIds.size > 0 && ` (${selectedLessonIds.size})`}
                  </Text>
              </TouchableOpacity>
          </View>
          
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#94A3B8" />
          </TouchableOpacity>
      </View>
  );

  const renderBrowseView = () => {
      if (currentLevel === 'subjects') {
          return (
            <FlatList
                data={subjects}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => {
                    // حساب عدد الدروس المختارة داخل هذه المادة
                    const selectedInSubject = lessonsMap[item.id]?.filter(l => selectedLessonIds.has(l.id)).length || 0;
                    
                    return (
                        <TouchableOpacity 
                            style={[styles.rowItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                            onPress={() => handleSubjectPress(item)}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: item.color_primary || '#6366f1' }]}>
                                <FontAwesome5 name={item.icon || 'book'} size={14} color="white" />
                            </View>
                            <Text style={[styles.rowTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{item.title}</Text>
                            
                            {selectedInSubject > 0 && (
                                <View style={styles.miniBadge}>
                                    <Text style={styles.miniBadgeText}>{selectedInSubject}</Text>
                                </View>
                            )}
                            <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color="#475569" style={{ marginHorizontal: 8 }} />
                        </TouchableOpacity>
                    );
                }}
            />
          );
      } else {
          // Lessons Level
          return (
            <View style={{ flex: 1 }}>
                <TouchableOpacity onPress={() => setCurrentLevel('subjects')} style={[styles.backRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={18} color="#38BDF8" />
                    <Text style={styles.backText}>{activeSubject?.title}</Text>
                </TouchableOpacity>
                
                {loading ? (
                    <ActivityIndicator color="#38BDF8" style={{ marginTop: 20 }} />
                ) : (
                    <FlatList
                        data={lessonsMap[activeSubject?.id] || []}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                        renderItem={({ item }) => {
                            const isSelected = selectedLessonIds.has(item.id);
                            return (
                                <TouchableOpacity 
                                    style={[
                                        styles.lessonRow, 
                                        isSelected && styles.lessonRowSelected,
                                        { flexDirection: isRTL ? 'row-reverse' : 'row' }
                                    ]}
                                    onPress={() => toggleLesson(item, activeSubject)}
                                >
                                    <View style={[styles.checkCircle, isSelected && styles.checkCircleActive]}>
                                        {isSelected && <FontAwesome5 name="check" size={10} color="white" />}
                                    </View>
                                    <Text style={[
                                        styles.lessonTitle, 
                                        isSelected && styles.lessonTitleSelected,
                                        { textAlign: isRTL ? 'right' : 'left' }
                                    ]}>
                                        {item.title}
                                    </Text>
                                </TouchableOpacity>
                            );
                        }}
                        ListEmptyComponent={<Text style={styles.emptyText}>{t('noLessonsFound') || "No lessons found."}</Text>}
                    />
                )}
            </View>
          );
      }
  };

 const renderSelectedView = () => (
      <View style={{ flex: 1 }}>
          {loading ? (
              <View style={styles.centerEmpty}>
                  <ActivityIndicator color="#38BDF8" size="large" />
                  <Text style={[styles.emptyText, { marginTop: 15 }]}>
                      {t('loadingDetails') || "Loading lesson details..."}
                  </Text>
              </View>
          ) : selectedLessonIds.size === 0 ? (
              <View style={styles.centerEmpty}>
                  <MaterialCommunityIcons name="link-variant-off" size={40} color="#334155" />
                  <Text style={styles.emptyText}>{t('noSelection') || "No lessons selected yet."}</Text>
                  <TouchableOpacity onPress={() => setActiveTab('browse')} style={styles.startBrowsingBtn}>
                      <Text style={styles.startBrowsingText}>{t('startBrowsing') || "Start Browsing"}</Text>
                  </TouchableOpacity>
              </View>
          ) : (
              <FlatList
                  data={selectedLessonsDetails}
                  keyExtractor={item => item.id}
                  contentContainerStyle={styles.listContent}
                  itemLayoutAnimation={Layout.springify()}
                  renderItem={({ item }) => (
                      <Animated.View 
                        entering={FadeIn} 
                        exiting={FadeOut}
                        style={[styles.selectedCard, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                      >
                          <View style={{ flex: 1 }}>
                              <Text style={[styles.selectedCardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{item.title}</Text>
                              <Text style={[styles.selectedCardSub, { textAlign: isRTL ? 'right' : 'left' }]}>
                                 {item.subjectName || t('defaultSubjectName') || "Subject"}
                              </Text>
                          </View>
                          <TouchableOpacity 
                            onPress={() => toggleLesson(item, { id: item.subjectId, title: item.subjectName })}
                            style={styles.removeBtn}
                          >
                              <Ionicons name="trash-outline" size={18} color="#EF4444" />
                          </TouchableOpacity>
                      </Animated.View>
                  )}
                  // في حال كان هناك اختلاف بين العداد والتفاصيل (نادر)
                  ListEmptyComponent={
                      <Text style={styles.emptyText}>{t('missingDetailsError') || "Details missing."}</Text>
                  }
              />
          )}
      </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.overlay}>
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
            <Animated.View entering={SlideInDown} style={styles.container}>
                {renderHeader()}
                
                <View style={styles.content}>
                    {activeTab === 'browse' ? renderBrowseView() : renderSelectedView()}
                </View>

               
                <View style={styles.footer}>
                    <TouchableOpacity 
                        // 1. أزلنا شرط الـ styleDisabled ليبقى الزر نشطاً دائماً
                        style={styles.applyBtn} 
                        onPress={handleConfirm}
                        // 2. أزلنا خاصية disabled التي كانت تمنع الضغط عند الرقم 0
                    >
                        <Text style={styles.applyBtnText}>
                            {selectedLessonIds.size === 0 
                                ? (t('saveChanges') || 'Save Changes') // نص بديل عند عدم اختيار شيء
                                : `${t('saveLinks') || 'Save Links'} (${selectedLessonIds.size})`
                            }
                        </Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  container: { height: height * 0.85, backgroundColor: '#0F172A', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  tabsContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4 },
  tab: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 8 },
  activeTab: { backgroundColor: '#334155' },
  tabText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  activeTabText: { color: 'white' },
  closeBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20 },

  content: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 100 },

  // Browse - Subjects
  rowItem: { backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12, marginBottom: 8, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
  iconContainer: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginHorizontal: 12 },
  rowTitle: { flex: 1, color: 'white', fontSize: 15, fontWeight: '500' },
  miniBadge: { backgroundColor: '#38BDF8', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  miniBadgeText: { color: '#0F172A', fontSize: 10, fontWeight: 'bold' },

  // Browse - Lessons
  backRow: { padding: 16, alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  backText: { color: '#38BDF8', fontSize: 14, fontWeight: '600' },
  lessonRow: { padding: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)', alignItems: 'center' },
  lessonRowSelected: { backgroundColor: 'rgba(56, 189, 248, 0.05)' },
  checkCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#475569', marginHorizontal: 12, justifyContent: 'center', alignItems: 'center' },
  checkCircleActive: { backgroundColor: '#38BDF8', borderColor: '#38BDF8' },
  lessonTitle: { color: '#CBD5E1', fontSize: 14, flex: 1 },
  lessonTitleSelected: { color: 'white', fontWeight: '600' },

  // Selected View
  selectedCard: { backgroundColor: 'rgba(30, 41, 59, 0.5)', padding: 12, borderRadius: 12, marginBottom: 8, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  selectedCardTitle: { color: 'white', fontSize: 14, fontWeight: '600' },
  selectedCardSub: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  removeBtn: { padding: 8, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, marginHorizontal: 8 },
  
  centerEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#64748B', fontSize: 14, marginTop: 10, marginBottom: 20 },
  startBrowsingBtn: { backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 },
  startBrowsingText: { color: '#38BDF8', fontWeight: '600' },

  // Footer
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', backgroundColor: '#0F172A' },
  applyBtn: { backgroundColor: '#38BDF8', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  applyBtnDisabled: { backgroundColor: '#334155', opacity: 0.5 },
  applyBtnText: { color: '#0F172A', fontWeight: 'bold', fontSize: 16 }
});