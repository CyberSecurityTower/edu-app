import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, 
  ActivityIndicator, Dimensions, Pressable, Image 
} from 'react-native';
import { BlurView } from 'expo-blur';
import { FontAwesome5, Ionicons, Feather } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, ZoomIn, Easing } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient'; 
import ModernFolder from './GlassFolder'; 
import { apiService } from '../../../config/api';
import { useAppState } from '../../../context/AppStateContext';
import Toast from 'react-native-toast-message';

const { width, height } = Dimensions.get('window');

// 🔒 Card Dimensions
const CARD_WIDTH = width * 0.92;
const CARD_HEIGHT = height * 0.8; 

// 📐 Grid Calculations
const PADDING = 20;
const GAP = 15;
const COLUMNS = 2;
const ITEM_WIDTH = (CARD_WIDTH - (PADDING * 2) - (GAP * (COLUMNS - 1))) / COLUMNS;

// 🎨 Palette
const COLORS = {
    cardBg: 'rgba(30, 30, 30, 0.6)', 
    headerBg: 'rgba(40, 40, 40, 0.5)',
    accent: '#0A84FF', 
    text: '#FFFFFF',
    subText: '#98989D',
    border: 'rgba(255,255,255,0.12)',
    defaultFolder: '#38BDF8', 
};

const SMART_FOLDERS = [
    { id: 'smart_all', name: 'All Files', icon: 'layer-group', color: '#0A84FF', type: 'smart' },
    { id: 'smart_uploads', name: 'My Uploads', icon: 'cloud-upload-alt', color: '#30D158', type: 'smart' },
    { id: 'smart_purchased', name: 'Purchased', icon: 'shopping-bag', color: '#FF9F0A', type: 'smart' },
];

// --- 📁 Folder Item ---
const FolderItem = React.memo(({ item, onPress }) => {
    const isSmart = item.itemType === 'smart_folder';
    const folderColor = item.color || item.metadata?.color || COLORS.defaultFolder;

    return (
        <TouchableOpacity style={styles.gridItem} onPress={() => onPress(item)} activeOpacity={0.6}>
            <View style={styles.folderPreviewContainer}>
                <ModernFolder 
                    name="" 
                    count={0} 
                    scale={0.7} 
                    color={folderColor} 
                    isSmart={isSmart}
                />
                 {isSmart && (
                     <BlurView intensity={20} style={styles.smartIconBadge}>
                        <FontAwesome5 name={item.icon} size={10} color="white" />
                     </BlurView>
                 )}
            </View>
            
            <View style={styles.gridTextContainer}>
                <Text style={styles.gridTitle} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.gridSub}>{isSmart ? 'Smart Folder' : 'Folder'}</Text>
            </View>
        </TouchableOpacity>
    );
});

// --- 📄 File Item ---
const FileItem = React.memo(({ item, onPress, isLoading }) => {
    const isPdf = item.type?.toLowerCase().includes('pdf') || item.file_type?.toLowerCase().includes('pdf');
    const isImage = item.type?.toLowerCase().includes('image') || item.mime_type?.startsWith('image');
    
    // Resolve Thumbnail
    const thumbnailSource = item.thumbnail_url || item.thumbnail || (isImage ? item.url : null);

    return (
        <TouchableOpacity 
            style={styles.gridItem} 
            onPress={() => onPress(item)} 
            activeOpacity={0.6}
            disabled={isLoading}
        >
            <View style={styles.filePreviewContainer}>
                {thumbnailSource ? (
                    <Image 
                        source={{ uri: thumbnailSource }} 
                        style={styles.thumbnailImage}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={styles.placeholderContainer}>
                         <FontAwesome5 
                            name={isPdf ? "file-pdf" : "image"} 
                            size={32} 
                            color="#64748B" 
                        />
                    </View>
                )}

                {/* ✅ Beautiful PDF Logo - Bottom Right */}
                {isPdf && (
                    <View style={styles.pdfBadgeContainer}>
                        <LinearGradient 
                            colors={['#FF5252', '#D32F2F']} 
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            style={styles.pdfBadgeGradient}
                        >
                            <Text style={styles.pdfBadgeText}>PDF</Text>
                        </LinearGradient>
                    </View>
                )}

                {/* ✅ Loading Overlay for Linking Process */}
                {isLoading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="small" color="#38BDF8" />
                    </View>
                )}
            </View>
            
            <View style={styles.gridTextContainer}>
                <Text style={styles.gridTitle} numberOfLines={1}>{item.title || item.file_name}</Text>
                <Text style={styles.gridSub} numberOfLines={1}>
                    {item.file_size || item.size || 'Unknown Size'}
                </Text>
            </View>
        </TouchableOpacity>
    );
});

export default function WorkspaceSelectionModal({ 
    visible, 
    onClose, 
    onSelect,
    targetLessonId, // ✅ Optional: If present, modal will link file to this lesson
    onLinkSuccess   // ✅ Optional: Callback to update parent list
}) {
  const { combinedLibrary } = useAppState();
  const [currentFolderId, setCurrentFolderId] = useState(null); 
  const [activeSmartFilter, setActiveSmartFilter] = useState(null);
  const [folderHistory, setFolderHistory] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // ✅ State to track which file is currently being linked
  const [linkingFileId, setLinkingFileId] = useState(null);
  
  const flatListRef = useRef(null);

  useEffect(() => {
    if (visible) {
      loadData();
    } else {
      const t = setTimeout(() => {
          setCurrentFolderId(null);
          setActiveSmartFilter(null);
          setFolderHistory([]);
          setLoading(false);
          setLinkingFileId(null);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [visible]);

  const loadData = async () => {
    setLoading(true);
    try {
        const res = await apiService.fetchFolders(null);
        setFolders(res || []);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const listData = useMemo(() => {
    if (activeSmartFilter) {
        let files = activeSmartFilter === 'smart_all' ? combinedLibrary : 
                    activeSmartFilter === 'smart_uploads' ? combinedLibrary.filter(f => f.is_upload) :
                    combinedLibrary.filter(f => !f.is_upload);
        return files.map(f => ({ ...f, itemType: 'file' }));
    }

    if (currentFolderId) {
        return [
            ...folders.filter(f => f.parent_id === currentFolderId).map(f => ({ ...f, itemType: 'folder' })),
            ...combinedLibrary.filter(f => f.folder_id === currentFolderId).map(f => ({ ...f, itemType: 'file' }))
        ];
    }

    return [
        ...SMART_FOLDERS.map(f => ({ ...f, itemType: 'smart_folder' })),
        ...folders.filter(f => !f.parent_id).map(f => ({ ...f, itemType: 'folder' })),
        ...combinedLibrary.filter(f => !f.folder_id).map(f => ({ ...f, itemType: 'file' }))
    ];
  }, [activeSmartFilter, currentFolderId, folders, combinedLibrary]);

  const handleNavigate = useCallback(async (item) => {
      if (item.itemType === 'file') {
          // ✅ CHECK: If we have a target lesson, we perform LINK action
          if (targetLessonId) {
              setLinkingFileId(item.id);
              try {
                  // Link file to lesson context
                  await apiService.linkSourceToContext(item.id, [targetLessonId], []);
                  
                  Toast.show({
                      type: 'success',
                      text1: 'Success',
                      text2: 'File linked to lesson successfully'
                  });

                  // Notify parent to refresh EduSources
                  if (onLinkSuccess) {
                      onLinkSuccess(item);
                  }
                  
                  // Close modal
                  onClose();
              } catch (error) {
                  console.error("Failed to link file:", error);
                  Toast.show({
                      type: 'error',
                      text1: 'Error',
                      text2: 'Failed to link file'
                  });
              } finally {
                  setLinkingFileId(null);
              }
          } else {
              // ✅ Default Action: Just select (Picker Mode)
              onClose();
              setTimeout(() => onSelect(item), 150);
          }
      } else {
          setFolderHistory(prev => [...prev, { id: currentFolderId, filter: activeSmartFilter }]);
          if (item.itemType === 'smart_folder') setActiveSmartFilter(item.id);
          else setCurrentFolderId(item.id);
          flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      }
  }, [currentFolderId, activeSmartFilter, targetLessonId, onLinkSuccess]);

  const handleBack = () => {
      const prev = folderHistory.pop();
      setFolderHistory([...folderHistory]);
      setActiveSmartFilter(prev?.filter || null);
      setCurrentFolderId(prev?.id || null);
  };

  const getCurrentTitle = () => {
      if (activeSmartFilter) return SMART_FOLDERS.find(s => s.id === activeSmartFilter)?.name;
      if (currentFolderId) return folders.find(f => f.id === currentFolderId)?.name || 'Folder';
      return "My Workspace";
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
        <View style={styles.centerContainer}>
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
                <Animated.View 
                    entering={FadeIn.duration(200)} 
                    exiting={FadeOut.duration(200)} 
                    style={styles.backdrop}
                >
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                </Animated.View>
            </Pressable>

            <Animated.View 
                entering={ZoomIn.duration(300).easing(Easing.out(Easing.exp))} 
                exiting={FadeOut.duration(200)}
                style={styles.cardContainer}
            >
                {/* 🎨 Glass Background */}
                <BlurView intensity={80} tint="dark" style={styles.glassBackground}>
                    
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.windowControls}>
                            <TouchableOpacity onPress={onClose} style={[styles.controlDot, { backgroundColor: '#FF5F57' }]}>
                                <Ionicons name="close" size={8} color="rgba(0,0,0,0.5)" />
                            </TouchableOpacity>
                            <View style={[styles.controlDot, { backgroundColor: '#FEBC2E' }]} />
                            <View style={[styles.controlDot, { backgroundColor: '#28C840' }]} />
                        </View>
                        
                        <Text style={styles.headerTitle}>{getCurrentTitle()}</Text>

                        {(currentFolderId || activeSmartFilter) && (
                            <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                                <Feather name="chevron-left" size={20} color={COLORS.text} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.divider} />

                    {/* Content */}
                    <View style={styles.content}>
                        {loading ? (
                            <View style={styles.centerBox}>
                                <ActivityIndicator size="small" color={COLORS.accent} />
                            </View>
                        ) : (
                            <FlatList
                                ref={flatListRef}
                                key="grid-layout-fixed"
                                data={listData}
                                numColumns={COLUMNS}
                                columnWrapperStyle={{ justifyContent: 'space-between', gap: GAP }}
                                keyExtractor={i => (i.id || Math.random()).toString()}
                                renderItem={({item}) => 
                                    (item.itemType === 'file') 
                                    ? <FileItem 
                                        item={item} 
                                        onPress={handleNavigate} 
                                        isLoading={linkingFileId === item.id} 
                                      />
                                    : <FolderItem item={item} onPress={handleNavigate} />
                                }
                                contentContainerStyle={styles.listContent}
                                showsVerticalScrollIndicator={false}
                                ListEmptyComponent={
                                    <View style={styles.centerBox}>
                                        <Feather name="folder" size={40} color={COLORS.subText} style={{opacity:0.3, marginBottom:10}} />
                                        <Text style={styles.emptyText}>Empty Folder</Text>
                                    </View>
                                }
                            />
                        )}
                    </View>
                </BlurView>
            </Animated.View>
        </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
  },
  backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.4)',
  },
  cardContainer: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: COLORS.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 25 },
      shadowOpacity: 0.5,
      shadowRadius: 40,
      elevation: 30,
      backgroundColor: '#1E293B',
  },
  glassBackground: {
      flex: 1,
      backgroundColor: COLORS.cardBg,
  },
  header: {
      height: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      backgroundColor: COLORS.headerBg,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
      position: 'relative'
  },
  windowControls: {
      position: 'absolute',
      left: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8
  },
  controlDot: {
      width: 11,
      height: 11,
      borderRadius: 6,
      justifyContent: 'center',
      alignItems: 'center',
  },
  headerTitle: {
      color: COLORS.text,
      fontSize: 14,
      fontWeight: '600',
      opacity: 0.9
  },
  backBtn: {
      position: 'absolute',
      right: 10,
      padding: 4,
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderRadius: 8
  },
  divider: { height: 1, width: '100%', backgroundColor: 'transparent' }, 
  content: { flex: 1 },
  listContent: { padding: PADDING, paddingBottom: 40 },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyText: { color: COLORS.subText, fontSize: 13 },

  // --- Grid Item Styles ---
  gridItem: {
      width: ITEM_WIDTH,
      marginBottom: 20,
      alignItems: 'center',
  },
  
  // --- Folder Styles ---
  folderPreviewContainer: {
      width: ITEM_WIDTH,
      height: ITEM_WIDTH * 0.75,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
  },
  smartIconBadge: {
      position: 'absolute',
      bottom: 12,
      right: 15,
      backgroundColor: 'rgba(0,0,0,0.3)',
      borderRadius: 6,
      width: 22, 
      height: 22,
      justifyContent: 'center', 
      alignItems: 'center',
      overflow: 'hidden'
  },

  // --- File & Thumbnail Styles ---
  filePreviewContainer: {
      width: ITEM_WIDTH,
      height: ITEM_WIDTH * 0.75,
      backgroundColor: '#0F172A',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
      overflow: 'hidden', 
      position: 'relative',
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
  },
  // ✅ Loading Overlay Style
  loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 20
  },
  thumbnailImage: {
      width: '100%',
      height: '100%',
  },
  placeholderContainer: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
      borderRadius: 14,
  },

  // --- ✅ PDF Badge (Bottom Right) ---
  pdfBadgeContainer: {
      position: 'absolute',
      bottom: 6,   // ✅ Bottom
      right: 6,    // ✅ Right
      shadowColor: "#000",
      shadowOpacity: 0.3,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 2 },
      zIndex: 10
  },
  pdfBadgeGradient: {
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 4,
      justifyContent: 'center',
      alignItems: 'center',
      minWidth: 32,
  },
  pdfBadgeText: {
      color: 'white',
      fontSize: 9,
      fontWeight: 'bold',
      letterSpacing: 0.5,
      textShadowColor: 'rgba(0,0,0,0.2)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 1
  },

  // --- Text Styles ---
  gridTextContainer: {
      width: '100%',
      alignItems: 'center',
      paddingHorizontal: 4
  },
  gridTitle: {
      color: '#E2E8F0',
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
      width: '100%',
      marginBottom: 2
  },
  gridSub: {
      color: '#64748B',
      fontSize: 10,
      fontWeight: '500',
      textAlign: 'center'
  }
});