// components/minichat/MessageAttachmentsRenderer.jsx
import React from 'react';
import { View, Image, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

// 🛠️ دالة مساعدة لاستخراج الامتداد بشكل آمن
const getExtension = (filename, mime) => {
  if (filename && filename.includes('.')) {
    return filename.split('.').pop().toLowerCase();
  }
  if (mime && mime.includes('/')) {
    return mime.split('/')[1].toLowerCase();
  }
  return 'file';
};

// 🎨 تحديد الأيقونات والألوان
const getFileInfo = (filename, mime) => {
  const ext = getExtension(filename, mime);
  
  switch (ext) {
    case 'pdf': 
      return { icon: 'file-pdf-box', color: '#DC2626', bg: '#FEF2F2', label: 'PDF' };
    case 'doc': case 'docx': 
      return { icon: 'file-word-box', color: '#2563EB', bg: '#EFF6FF', label: 'WORD' };
    case 'xls': case 'xlsx': case 'csv':
      return { icon: 'file-excel-box', color: '#059669', bg: '#ECFDF5', label: 'EXCEL' };
    case 'ppt': case 'pptx': 
      return { icon: 'file-powerpoint-box', color: '#D97706', bg: '#FFFBEB', label: 'PPT' };
    case 'zip': case 'rar': 
      return { icon: 'zip-box', color: '#7C3AED', bg: '#F5F3FF', label: 'ZIP' };
    case 'txt': 
      return { icon: 'file-document-outline', color: '#475569', bg: '#F8FAFC', label: 'TXT' };
    default: 
      return { icon: 'file-document', color: '#64748B', bg: '#F1F5F9', label: 'FILE' };
  }
};

const formatSize = (size) => {
  if (!size) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const FileCard = ({ file, onPress }) => {
  // ✅ تطبيع البيانات (Normalizing Data)
  // url: من السيرفر، uri: من الجهاز المحلي
  const uri = file.url || file.uri;
  const name = file.name || file.original_filename || 'Document';
  const { icon, color, bg, label } = getFileInfo(name, file.mime || file.type);

  return (
    <Pressable 
      style={[styles.fileCard, { backgroundColor: bg, borderColor: `${color}30` }]}
      onPress={() => onPress(uri)}
    >
      <View style={[styles.iconBox, { backgroundColor: 'white' }]}>
        <MaterialCommunityIcons name={icon} size={28} color={color} />
      </View>

      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
          {name}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.fileTypeBadge, { color: color, backgroundColor: `${color}15` }]}>
            {label}
          </Text>
          {file.size > 0 && (
            <Text style={styles.fileSize}>{formatSize(file.size)}</Text>
          )}
        </View>
      </View>

      <MaterialCommunityIcons name="arrow-down-circle-outline" size={20} color={color} style={{ opacity: 0.6 }} />
    </Pressable>
  );
};

const MessageAttachmentsRenderer = ({ attachments, onImagePress }) => {
  if (!attachments || attachments.length === 0) return null;

  // ✅ تصفية محسنة تعتمد على mime type أو resource_type (Cloudinary)
  // هذا يضمن أن الصور القادمة من الباك اند (التي قد يكون نوعها 'image/jpeg') تُعامل كصور
  const media = attachments.filter(a => {
    const type = (a.mime || a.type || a.resource_type || '').toLowerCase();
    return type.includes('image') || type.includes('video');
  });

  const files = attachments.filter(a => {
    const type = (a.mime || a.type || a.resource_type || '').toLowerCase();
    return !type.includes('image') && !type.includes('video');
  });

  const handleOpenFile = (uri) => {
    if (uri) {
      Linking.openURL(uri).catch(err => console.log('Cannot open file', err));
    }
  };

  return (
    <View style={styles.container}>
      
      {/* 1. عرض الصور والفيديو */}
      {media.length > 0 && (
        <View style={styles.mediaGrid}>
          {media.map((item, index) => {
            const uri = item.url || item.uri;
            // التحقق من الفيديو
            const type = (item.mime || item.type || '').toLowerCase();
            const isVideo = type.includes('video');
            
            // حساب الأبعاد للشبكة
            const isSingle = media.length === 1;
            const isThirdWithOdd = media.length === 3 && index === 0;
            const isFullWidth = isSingle || isThirdWithOdd;

            return (
              <Pressable 
                key={index} 
                onPress={() => !isVideo && onImagePress && onImagePress(uri)}
                style={[
                  styles.mediaItem,
                  isFullWidth ? styles.fullWidth : styles.halfWidth
                ]}
              >
                <Image source={{ uri: uri }} style={styles.image} resizeMode="cover" />
                {isVideo && (
                  <View style={styles.videoBadge}>
                    <Ionicons name="play" size={24} color="white" />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      {/* 2. عرض الملفات والمستندات */}
      {files.length > 0 && (
        <View style={styles.filesList}>
          {files.map((file, index) => (
            <FileCard 
              key={index} 
              file={file} 
              onPress={handleOpenFile}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
    width: '100%',
    alignItems: 'flex-end', 
  },
  
  // --- Media Styles ---
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    justifyContent: 'flex-end',
    gap: 4,
  },
  mediaItem: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  fullWidth: { 
    width: '100%', 
    height: 180,
  },
  halfWidth: { 
    width: '48%', 
    height: 120,
    flexGrow: 1, 
  },
  image: { width: '100%', height: '100%' },
  videoBadge: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // --- File Styles ---
  filesList: {
    width: '100%',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '85%',
    maxWidth: 300,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  fileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  fileName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
    textAlign: 'left',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fileTypeBadge: {
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fileSize: {
    fontSize: 10,
    color: '#94A3B8',
  },
});

export default MessageAttachmentsRenderer;