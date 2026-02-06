import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import ModernFolder from './GlassFolder'; 
import { useLanguage } from '../../../context/LanguageContext';

// مكون فرعي للمجلد الواحد لضمان عزل القياسات
const FolderItemWrapper = ({ 
    folder, onPress, onLongPress, onLayoutRegister, isHovered, count, isSmart 
}) => {
    const viewRef = useRef(null);

    const measureFolder = () => {
        if (viewRef.current && onLayoutRegister) {
            viewRef.current.measure((x, y, width, height, pageX, pageY) => {
                // ✅ نرسل pageX و pageY وهي الإحداثيات المطلقة على الشاشة
                // نضيف هامش أمان (padding) لزيادة منطقة التفاعل
                onLayoutRegister(folder.id, { 
                    x: pageX, 
                    y: pageY, 
                    width, 
                    height 
                });
            });
        }
    };

    // قياس عند التحميل
    useEffect(() => {
        // تأخير بسيط لضمان اكتمال الرسم
        const timer = setTimeout(measureFolder, 200);
        
        // تحديث القياسات كل فترة قصيرة (لحل مشكلة التمرير الأفقي)
        // هذا حل بسيط وفعال يغنينا عن تتبع الـ Scroll Event المعقد
        const interval = setInterval(measureFolder, 1000);

        return () => {
            clearTimeout(timer);
            clearInterval(interval);
        };
    }, []);

    return (
        <TouchableOpacity 
            ref={viewRef}
            // ✅ collapsable={false} ضروري جداً في الأندرويد لتعمل الـ measure
            collapsable={false}
            onPress={() => onPress(folder)} 
            onLongPress={() => onLongPress && onLongPress(folder)}
            delayLongPress={300}
            activeOpacity={0.6}
            style={[styles.folderWrapper, { zIndex: isHovered ? 100 : 1 }]}
        >
            <ModernFolder 
                name={folder.name} 
                count={count} 
                scale={isHovered ? 1.05 : 0.85} 
                color={folder.color || folder.metadata?.color || '#38BDF8'}
                isHovered={isHovered} 
                isSmart={isSmart}
            />
        </TouchableOpacity>
    );
};

export default function FolderStrip({ 
  folders = [], 
  smartFolders = [], 
  libraryCount = 0, 
  onFolderPress, 
  onCreatePress,
  onLongPress,
  getFolderCount,
  onLayoutRegister, 
  hoveredFolderId   
}) {
  const { t, isRTL } = useLanguage();

  return (
    <View style={styles.container}> 
        <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            // ✅ التعديل: عكس اتجاه الترتيب لضمان ظهور الزر في النهاية في كلا اللغتين
            contentContainerStyle={[styles.scrollContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        >
            
            {/* 1. Smart Folders (أولاً) */}
            {smartFolders.map((folder) => (
                 <FolderItemWrapper
                    key={folder.id}
                    folder={folder}
                    onPress={onFolderPress}
                    onLayoutRegister={null} 
                    isHovered={false}
                    count={folder.id === 'smart_all' ? libraryCount : 0}
                    isSmart={true}
                 />
            ))}

            {/* 2. User Folders (ثانياً) */}
            {folders.map((folder) => (
                <FolderItemWrapper 
                    key={folder.id}
                    folder={folder}
                    onPress={onFolderPress}
                    onLongPress={onLongPress}
                    onLayoutRegister={onLayoutRegister}
                    isHovered={hoveredFolderId === folder.id}
                    count={getFolderCount ? getFolderCount(folder.id) : 0}
                    isSmart={false}
                />
            ))}

            {/* 3. زر إضافة مجلد (أصبح في الأخير الآن) ✅ */}
            <TouchableOpacity style={styles.addFolderCard} onPress={onCreatePress}>
                <View style={styles.addIconCircle}>
                        <FontAwesome5 name="plus" size={20} color="#38BDF8" />
                </View>
                <Text style={styles.addFolderText}>{t('newFolder') || 'New'}</Text>
            </TouchableOpacity>

        </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 15, height: 140 },
  scrollContent: { paddingHorizontal: 15, paddingBottom: 5, alignItems: 'center', minHeight: 130 },
  
  // ✅ قمنا بتعديل الهوامش لزر الإضافة ليتناسب مع موقعه الجديد
  addFolderCard: { 
      width: 85, height: 100, backgroundColor: 'rgba(255,255,255,0.03)', 
      borderRadius: 16, justifyContent: 'center', alignItems: 'center', 
      borderWidth: 1.5, borderColor: 'rgba(56, 189, 248, 0.3)', 
      borderStyle: 'dashed', 
      marginTop: -15,
      marginHorizontal: 12 // مسافة من الجانبين
  },
  addIconCircle: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: 'rgba(56, 189, 248, 0.1)',
      alignItems: 'center', justifyContent: 'center', marginBottom: 8
  },
  addFolderText: { color: '#38BDF8', fontSize: 13, fontWeight: '600' },
  folderWrapper: { marginHorizontal: 6 }
});