import React from 'react';
import { ScrollView, View, Image, StyleSheet, Pressable, Text } from 'react-native';
import Animated, { 
  FadeInDown, 
  FadeOutUp, 
  Layout, 
  ZoomIn, 
  ZoomOut 
} from 'react-native-reanimated';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const AttachmentItem = ({ item, onRemove, index }) => {
  const isMedia = item.type === 'image' || item.type === 'video';

  // استخراج الامتداد للملفات (مثلاً PDF, DOC)
  const fileExtension = !isMedia && item.name 
    ? item.name.split('.').pop().toUpperCase().slice(0, 4) 
    : 'FILE';

  return (
    <Animated.View 
      entering={ZoomIn.delay(index * 100).springify()} 
      exiting={ZoomOut.springify()}
      layout={Layout.springify()}
      style={styles.itemContainer}
    >
      {/* ✅ 1. عرض الوسائط (صور وفيديو) */}
      {isMedia ? (
        <>
          <Image source={{ uri: item.uri }} style={styles.image} />
          {item.type === 'video' && (
            <View style={styles.videoOverlay}>
              <Ionicons name="play" size={20} color="white" />
            </View>
          )}
        </>
      ) : (
        /* ✅ 2. عرض الملفات والمستندات */
        <View style={styles.fileContainer}>
          {/* أيقونة الملف */}
          <MaterialCommunityIcons name="file-document-outline" size={24} color="#64748B" />
          
          {/* شارة الامتداد (PDF, ZIP...) */}
          <View style={styles.extensionBadge}>
            <Text style={styles.extensionText}>{fileExtension}</Text>
          </View>

          {/* اسم الملف */}
          <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
            {item.name || 'Document'}
          </Text>
        </View>
      )}

      {/* Remove Button */}
      <Pressable onPress={onRemove} style={styles.removeBtn}>
        <Feather name="x" size={10} color="white" />
      </Pressable>
    </Animated.View>
  );
};

export default function AttachmentPreview({ attachments = [], onRemove }) {
  if (attachments.length === 0) return null;

  return (
    <Animated.View 
      entering={FadeInDown.springify()} 
      exiting={FadeOutUp.duration(200)}
      layout={Layout.springify()}
      style={styles.container}
    >
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {attachments.map((item, index) => (
          <AttachmentItem 
            key={item.id} 
            item={item} 
            index={index}
            onRemove={() => onRemove(item.id)} 
          />
        ))}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 72, // زيادة طفيفة لاستيعاب النصوص
    marginBottom: 8,
  },
  scrollContent: {
    paddingHorizontal: 12, // تحسين الحواف
    alignItems: 'center',
  },
  itemContainer: {
    width: 64, // زيادة العرض قليلاً للملفات
    height: 64,
    borderRadius: 14,
    marginRight: 10,
    position: 'relative',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, // تخفيف الظل ليناسب التصميم المسطح للملفات
    shadowRadius: 4,
    elevation: 3,
    backgroundColor: 'white',
  },
  
  // --- Media Styles ---
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    resizeMode: 'cover',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },

  // --- File Styles (New) ---
  fileContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    backgroundColor: '#F8FAFC', // لون خلفية فاتح (Slate-50)
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
    paddingTop: 8,
  },
  fileName: {
    fontSize: 9,
    color: '#475569',
    marginTop: 4,
    width: '100%',
    textAlign: 'center',
    fontWeight: '500',
  },
  extensionBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 4,
  },
  extensionText: {
    fontSize: 6,
    fontWeight: '800',
    color: '#64748B',
  },

  // --- Button Styles ---
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2, // زيادة سمك الحدود البيضاء
    borderColor: 'white',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    zIndex: 10,
  }
});