import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  View, StyleSheet, FlatList, Dimensions, StatusBar, TouchableOpacity, Text, 
  RefreshControl, Platform, Keyboard 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import Toast from 'react-native-toast-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { 
    useAnimatedStyle, useSharedValue, withSpring, ZoomIn, ZoomOut, LinearTransition, FadeIn 
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import AudioDetailModal from './components/AudioDetailModal';
// --- Components ---
import FolderOptionsModal from './components/FolderOptionsModal'; 
import WorkspaceHeader from './components/WorkspaceHeader';
import StorageStats from './components/StorageStats';
import FileGridItem from './components/FileGridItem';
import FileDetailModal from './components/FileDetailModal'; 
import CustomAlert from '../../components/CustomAlert';
import SecureFileViewer from '../store/SecureFileViewer';
import DraggableItemWrapper from './components/DraggableItemWrapper';
import ModernFolder from './components/GlassFolder';
import CreateFolderModal from './components/CreateFolderModal';
import FolderStrip from './components/FolderStrip';
import FolderNavigationHeader from './components/FolderNavigationHeader';
import UploadModal from '../../components/UploadModal';
import VinylAudioItem from './components/VinylAudioItem';
// --- Logic & Config ---
import { apiService } from '../../config/api'; 
import { useLanguage } from '../../context/LanguageContext';
import { useAppState } from '../../context/AppStateContext'; 
import { useWorkspaceDrag } from '../../hooks/useWorkspaceDrag';
import StorageDetailsModal from './components/StorageDetailsModal';
// بيانات وهمية للتجربة (احذفها لاحقاً)
const { width } = Dimensions.get('window');
const SYSTEM_BLUE = '#38BDF8'; 

const SMART_FOLDERS = [
    { id: 'smart_all', name: 'All', icon: 'layer-group', color: SYSTEM_BLUE, type: 'smart' },
    { id: 'smart_subjects', name: 'Subjects', icon: 'book', color: SYSTEM_BLUE, type: 'smart' },
    { id: 'smart_uploaded', name: 'My Uploads', icon: 'cloud-upload-alt', color: SYSTEM_BLUE, type: 'smart' },
    { id: 'smart_purchased', name: 'Items', icon: 'shopping-bag', color: SYSTEM_BLUE, type: 'smart' },
];

// 🌍 نصوص الحالات الفارغة

const EMPTY_STATES = {
  ar: {
      zeroState: {
      title: "مساحة عملك فارغة تماماً!",
      subtitle: "لا تقلق، يمكنك البدء برفع ملفات PDF الآن أو تصفح المتجر.",
      btnUpload: "رفع ملف",      
      btnStore: "تصفح المتجر"    
    },
    emptyFolder: {
      title: "هذا المكان هادئ...",
      subtitle: "لا توجد ملفات هنا حالياً، جرب البحث في مجلد آخر."
    },
    search: "لم يتم العثور على نتائج",
    lessons: "لا توجد دروس"
  },
  en: {
     zeroState: {
      title: "Your workspace is empty!",
      subtitle: "Don't worry, start uploading PDFs now or explore the store.",
      btnUpload: "Upload PDF",
      btnStore: "Explore Store"
    },
    emptyFolder: {
      title: "It's quiet here...",
      subtitle: "No files here yet, try checking another folder."
    },
    search: "No results found",
    lessons: "No lessons found"
  },
  fr: {
    zeroState: {
      title: "Votre espace est vide !",
      subtitle: "Ne vous inquiétez pas, commencez à importer des PDF ou explorez la boutique.",
      btnUpload: "Importer PDF",
      btnStore: "Boutique"
    },
    emptyFolder: {
      title: "C'est calme ici...",
      subtitle: "Aucun fichier ici pour l'instant, essayez un autre dossier."
    },
    search: "Aucun résultat trouvé",
    lessons: "Aucune leçon trouvée"
  }
};
export default function WorkspaceScreen() {
  const { t, isRTL, language } = useLanguage(); 
  const { combinedLibrary = [], refreshUserSources, storageUsage } = useAppState(); 
  const router = useRouter(); 
  const [selectedAudio, setSelectedAudio] = useState(null);
  const emptyText = EMPTY_STATES[language] || EMPTY_STATES.en;

  // --- Hierarchy State ---
  const [currentFolderId, setCurrentFolderId] = useState(null); 
  const [currentFolderName, setCurrentFolderName] = useState(null); 
  const [activeSmartFilter, setActiveSmartFilter] = useState(null); 
  const [currentLessonId, setCurrentLessonId] = useState(null);
  
  // --- Data Lists ---
  const [lessonsList, setLessonsList] = useState([]);
  const [folders, setFolders] = useState([]); 
  const [subjectsList, setSubjectsList] = useState([]); 
  
  // --- Search State (WorkLens) 🔍 ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false); // هل نحن في وضع البحث؟
  const [isStorageModalVisible, setStorageModalVisible] = useState(false);
  // --- UI State ---
  const [optimisticHiddenIds, setOptimisticHiddenIds] = useState([]);
  const [isCreateFolderVisible, setCreateFolderVisible] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [alertConfig, setAlertConfig] = useState({ isVisible: false, item: null, type: 'file' });
  const [viewerVisible, setViewerVisible] = useState(false);
  const [fileToView, setFileToView] = useState(null);
  const [folderToEdit, setFolderToEdit] = useState(null); 
  const [optionsFolder, setOptionsFolder] = useState(null); 
  const [isOptionsVisible, setOptionsVisible] = useState(false); 

  // --- Upload State ---
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // --- Animations ---
  const fabScale = useSharedValue(1);
  const fabStyle = useAnimatedStyle(() => ({ transform: [{ scale: fabScale.value }] }));

  // ==========================================================
  // 1. Data Fetching & Search Logic
  // ==========================================================

  const fetchData = useCallback(async (isManual = false) => {
    try {
        if (isManual) setRefreshing(true);

        const fetchedFolders = await apiService.fetchFolders(null);
        setFolders(fetchedFolders);
        await refreshUserSources();
        
        setOptimisticHiddenIds([]); 

        if (activeSmartFilter === 'smart_subjects') {
             if (currentFolderId === 'SMART_ROOT') {
                 await fetchSubjects();
             } else if (currentFolderId && currentFolderId !== 'SMART_ROOT') {
                 await fetchLessonsForSubject(currentFolderId, isManual);
             }
        }
    } catch (e) {
        console.error("Error fetching workspace data:", e);
    } finally {
        setRefreshing(false);
    }
  }, [refreshUserSources, activeSmartFilter, currentFolderId]);

  // ✅ WorkLens Search Function
  const performSearch = useCallback(async (query) => {
    if (!query || query.trim() === '') {
        handleClearSearch();
        return;
    }

    setIsSearchMode(true);
    setSearchQuery(query);
    setIsSearching(true);
    setSearchResults([]); // تصفير النتائج القديمة أثناء التحميل

    try {
        // البحث عبر السيرفر (WorkLens API)
        const results = await apiService.searchWorkLens(query, 'workspace');
        
        // تنسيق النتائج لتتوافق مع FileGridItem
        const formattedResults = results.map(item => ({
            ...item,
            // ضمان وجود الحقول الأساسية للعرض
            thumbnail_url: item.thumbnail_url || item.thumbnail, 
            file_size: item.size || item.file_size,
            // تحديد النوع للعرض الصحيح
            type: item.type || item.file_type || 'file'
        }));

        setSearchResults(formattedResults);
    } catch (e) {
        console.error("Search failed:", e);
        // Fallback: بحث محلي بسيط في حال فشل السيرفر
        const localResults = combinedLibrary.filter(f => 
            (f.title || f.name || '').toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(localResults);
    } finally {
        setIsSearching(false);
    }
  }, [combinedLibrary]);

  // ✅ Clear Search
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchMode(false);
    setIsSearching(false);
    Keyboard.dismiss();
  }, []);

  const fetchSubjects = async () => {
      try {
          const res = await apiService.get('/subjects/mine'); 
          if (res.success || res.subjects) setSubjectsList(res.subjects || []);
      } catch (e) { console.error("Error fetching subjects:", e); }
  };

  const fetchLessonsForSubject = async (subjectId, isManual = false) => {
      if (isManual) setRefreshing(true);
      try {
          const res = await apiService.get(`/educational/lessons`, { subjectId });
          setLessonsList(res.lessons || []);
      } catch (e) { 
          console.error("Error fetching lessons:", e); 
      } finally { 
          setRefreshing(false); 
      }
  };

  useFocusEffect(useCallback(() => { 
      if (!isSearchMode) fetchData(); 
  }, [fetchData, isSearchMode]));

  // ==========================================================
  // 2. Drag & Drop Hook
  // ==========================================================
  const { 
    draggedItem, dragX, dragY, hoveredFolderId, 
    setBackButtonLayout, registerFolderLayout, 
    handleDragStart, handleDragUpdate, handleDragEnd 
  } = useWorkspaceDrag(
      currentFolderId, 
      activeSmartFilter, 
      fetchData, 
      t,
      (fileId) => {
          setOptimisticHiddenIds(prev => [...prev, fileId]);
      }
  );
  
  const isBackHovered = hoveredFolderId === 'BACK';

  // ==========================================================
  // 3. Upload & File Logic
  // ==========================================================
  const handlePickFile = async () => {
    if (activeSmartFilter || isSearchMode) {
        Toast.show({ type: 'info', text1: t('readOnlyView'), text2: "Cannot upload here." });
        return;
    }

    Haptics.selectionAsync();
    try {
        const result = await DocumentPicker.getDocumentAsync({
            type: 'application/pdf', 
            copyToCacheDirectory: true,
        });

        if (!result.canceled && result.assets) {
            const file = result.assets[0];
            const MAX_SIZE = 9.9 * 1024 * 1024; 
            
            if (file.size > MAX_SIZE) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Toast.show({ type: 'error', text1: t('fileTooLarge'), text2: 'Max size 9.9 MB' });
                return;
            }

            setPendingFile(file);
            setUploadModalVisible(true);
        }
    } catch (e) {
        console.error("Picker Error", e);
    }
  };

  const handleConfirmUpload = async (customName, description) => {
      setUploadModalVisible(false);
      setIsUploading(true);
      setUploadProgress(10); 

      try {
          const progressInterval = setInterval(() => {
             setUploadProgress(prev => (prev < 80 ? prev + 10 : prev));
          }, 300);

          await apiService.uploadSource(
              pendingFile, [], [], customName, currentFolderId, description
          );

          clearInterval(progressInterval);
          setUploadProgress(100);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Toast.show({ type: 'success', text1: t('success'), text2: 'File uploaded successfully' });
          await fetchData();

      } catch (error) {
          console.error("Upload error:", error);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Toast.show({ type: 'error', text1: t('error'), text2: 'Upload failed' });
      } finally {
          setIsUploading(false);
          setPendingFile(null);
          setUploadProgress(0);
      }
  };

  // ==========================================================
  // 4. Filtering & Navigation Logic
  // ==========================================================
  const displayedFiles = useMemo(() => {
    // إذا كنا في وضع البحث، نعيد نتائج البحث مباشرة
    if (isSearchMode) return searchResults;

    let files = combinedLibrary; 

    if (activeSmartFilter === 'smart_all') files = combinedLibrary;
    else if (activeSmartFilter === 'smart_uploaded') files = combinedLibrary.filter(f => f.is_upload);
    else if (activeSmartFilter === 'smart_purchased') files = combinedLibrary.filter(f => f.is_inventory);
    else if (activeSmartFilter === 'smart_subjects') {
        if (currentFolderId === 'SMART_ROOT' || currentLessonId === null) files = []; 
        else files = combinedLibrary.filter(f => f.lesson_ids && f.lesson_ids.includes(currentLessonId));
    } else {
        files = combinedLibrary.filter(file => {
            const fId = file.folder_id;
            if (currentFolderId === null) return !fId;
            return fId === currentFolderId;
        });
    }

    // تصفية الملفات المخفية (Drag & Drop) وإرجاع المصفوفة النظيفة
    return files.filter(f => !optimisticHiddenIds.includes(f.id));

  }, [combinedLibrary, currentFolderId, activeSmartFilter, currentLessonId, optimisticHiddenIds, isSearchMode, searchResults]);
  const enterFolder = (item) => {
    // 🛑 منع دخول المجلدات أثناء البحث (إلا إذا أردت فتح الملف مباشرة)
    if (isSearchMode && item.type !== 'folder') return;

    if (item.type === 'smart') {
        setActiveSmartFilter(item.id);
        setCurrentFolderName(item.name);
        if (item.id === 'smart_subjects') {
            setCurrentFolderId('SMART_ROOT');
            fetchSubjects();
        } else {
            setCurrentFolderId('SMART'); 
        }
    } else if (activeSmartFilter === 'smart_subjects' && currentFolderId === 'SMART_ROOT') {
        setCurrentFolderId(item.id); 
        setCurrentFolderName(item.title || item.name);
        fetchLessonsForSubject(item.id);
    } else if (activeSmartFilter === 'smart_subjects' && currentFolderId !== 'SMART_ROOT' && currentLessonId === null) {
        setCurrentLessonId(item.id); 
        setCurrentFolderName(item.title || item.name);
    } else {
        setActiveSmartFilter(null);
        setCurrentFolderId(item.id);
        setCurrentFolderName(item.name);
    }
    Haptics.selectionAsync();
  };

  const goHome = () => {
    // إذا كنت تبحث وضغطت رجوع، قم بإلغاء البحث أولاً
    if (isSearchMode) {
        handleClearSearch();
        return;
    }

    if (activeSmartFilter === 'smart_subjects' && currentLessonId !== null) {
        setCurrentLessonId(null);
        const currentSubject = subjectsList.find(s => s.id === currentFolderId);
        setCurrentFolderName(currentSubject ? currentSubject.title : 'Subject');
    } else if (activeSmartFilter === 'smart_subjects' && currentFolderId !== 'SMART_ROOT') {
        setCurrentFolderId('SMART_ROOT');
        setCurrentFolderName(t('subjects') || 'Subjects');
        setLessonsList([]);
    } else {
        setCurrentFolderId(null);
        setCurrentFolderName(null);
        setActiveSmartFilter(null);
        setCurrentLessonId(null);
    }
    Haptics.selectionAsync();
  };

  // ==========================================================
  // 5. Actions (Edit, Delete, Open)
  // ==========================================================
  const handleFolderLongPress = (folder) => {
      if (activeSmartFilter || isSearchMode) return;
      setOptionsFolder(folder);
      setOptionsVisible(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleOptionOpen = () => { setOptionsVisible(false); enterFolder(optionsFolder); };
  
  const handleOptionEdit = () => {
      setOptionsVisible(false);
      setTimeout(() => { setFolderToEdit(optionsFolder); setCreateFolderVisible(true); }, 200);
  };

  const handleOptionDelete = () => {
      setOptionsVisible(false);
      setTimeout(() => {
          setAlertConfig({
            isVisible: true, item: optionsFolder, type: 'folder',
            customTitle: t('deleteFolder'), customMessage: t('deleteFolderConfirm') 
          });
      }, 200);
  };

  const handleSaveFolder = async (name, color, folderId) => {
      setIsCreatingFolder(true); 
      try {
          if (folderId) {
              await apiService.updateFolder(folderId, name, color);
              Toast.show({ type: 'success', text1: 'Updated' });
          } else {
              await apiService.createFolder(name, currentFolderId, color);
              Toast.show({ type: 'success', text1: 'Created' });
          }
          setCreateFolderVisible(false);
          setFolderToEdit(null); 
          fetchData(); 
      } catch (error) { Toast.show({ type: 'error', text1: 'Error' }); } 
      finally { setIsCreatingFolder(false); }
  };
  
  const closeCreateModal = () => { setCreateFolderVisible(false); setFolderToEdit(null); };

  const performDelete = async () => {
    setIsDeleting(true);
    try {
        if (alertConfig.type === 'folder') await apiService.deleteFolder(alertConfig.item.id);
        else await apiService.deleteSource(alertConfig.item.id); 
        
        Toast.show({ type: 'success', text1: t('success') });
        // إذا كنا في البحث، نحذف العنصر من النتائج محلياً
        if (isSearchMode) {
            setSearchResults(prev => prev.filter(i => i.id !== alertConfig.item.id));
        }
        await fetchData(); 
    } catch (e) {
        Toast.show({ type: 'error', text1: t('error') });
    } finally {
        setIsDeleting(false);
        setAlertConfig({ isVisible: false, item: null, type: 'file' });
        setSelectedFile(null);
    }
  };
 
const handleFileAction = async (action, payload) => {
    if (action === 'open') { 
        const targetFile = payload || selectedFile; 
        setSelectedFile(null); 
        if (!targetFile) return;

        const fileName = (targetFile.title || targetFile.file_name || targetFile.name || '').toLowerCase();
        const fileType = (targetFile.type || targetFile.file_type || targetFile.mime_type || '').toLowerCase();
        const fileUrl = (targetFile.file_url || targetFile.url || '').toLowerCase();

        const isPdf = fileType.includes('pdf') || fileName.endsWith('.pdf') || fileUrl.endsWith('.pdf');

        if (isPdf) {
            const safeUrl = encodeURIComponent(targetFile.file_url || targetFile.url);
            setTimeout(() => {
                router.push({
                    pathname: '/pdf-viewer',
                    params: { url: safeUrl, title: targetFile.title || targetFile.file_name }
                });
            }, 300);
        } else {
            setFileToView(targetFile); 
            setTimeout(() => setViewerVisible(true), 300); 
        }
    } 
    else if (action === 'delete') { 
        if(activeSmartFilter && !isSearchMode) {
            Toast.show({ type: 'info', text1: t('readOnlyView'), text2: "Cannot delete from this view" });
            return;
        }
        setAlertConfig({ isVisible: true, item: selectedFile, type: 'file' }); 
    } 
    else if (action === 'link') {
        try {
            await apiService.linkSourceToContext(payload.fileId, payload.lessonId, payload.subjectId);
            Toast.show({ type: 'success', text1: t('success') });
            setSelectedFile(null);
            await refreshUserSources(); 
        } catch (e) { Toast.show({ type: 'error', text1: t('error') }); }
    }
    else if (action === 'rename') {
        const { fileId, newName } = payload;
        setSelectedFile(prev => prev ? ({ ...prev, title: newName, file_name: newName }) : null);
        Toast.show({ type: 'success', text1: 'Renamed' });
        fetchData(); 
    }
  };

  // ==========================================================
  // 6. Rendering Logic
  // ==========================================================
  const isSubjectView = activeSmartFilter === 'smart_subjects' && currentFolderId === 'SMART_ROOT' && !isSearchMode;
  const isLessonView = activeSmartFilter === 'smart_subjects' && currentFolderId !== 'SMART_ROOT' && currentLessonId === null && !isSearchMode;
  const numColumns = isSubjectView ? 3 : (isLessonView ? 1 : 2);

  const ghostStyle = useAnimatedStyle(() => ({
    position: 'absolute', top: 0, left: 0, opacity: draggedItem ? 0.9 : 0,
    zIndex: 9999,
    transform: [{ translateX: dragX.value }, { translateY: dragY.value }]
  }));

  const renderUploadOverlay = () => {
    if (!isUploading) return null;
    return (
      <View style={[StyleSheet.absoluteFill, { zIndex: 999, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)' }]}>
         <BlurView intensity={40} tint="dark" style={styles.progressContainer}>
            <View style={{ width: 120, height: 120 }}>
                <LottieView source={require('../.././assets/images/cloud_upload.json')} autoPlay loop style={{ flex: 1 }} resizeMode="contain" />
            </View>
            <Text style={styles.progressText}>{t('uploading') || "Uploading..."}</Text>
            <View style={styles.progressBarTrack}>
              <Animated.View style={[styles.progressBarFill, { width: `${uploadProgress}%`, backgroundColor: '#38BDF8' }]} layout={LinearTransition.springify()} />
            </View>
         </BlurView>
      </View>
    );
  };

  // ✅ دالة عرض الحالة الفارغة الذكية
  
  
  // ✅ استخدام useCallback لضمان ثبات مرجع الدالة
  const renderEmptyState = useCallback(() => {
    // 1. حالة البحث
    if (isSearchMode) {
      return (
        <View style={styles.emptyState}>
          <FontAwesome5 name="search" size={width * 0.15} color="#334155" />
          <Text style={styles.emptyTitle}>{emptyText.search}</Text>
        </View>
      );
    }

    // 2. حالة الدروس
    if (isLessonView) {
      return (
        <View style={styles.emptyState}>
          <FontAwesome5 name="clipboard-list" size={width * 0.15} color="#334155" />
          <Text style={styles.emptyTitle}>{emptyText.lessons}</Text>
        </View>
      );
    }

    const totalFilesCount = combinedLibrary.length;

    // تحديد نوع الحالة والنصوص
    let type = 'folder';
    let currentTexts = emptyText.emptyFolder;

    if (totalFilesCount === 0) {
        type = 'zero';
        currentTexts = emptyText.zeroState;
    }

    // ✅ استدعاء المكون المحفوظ (Memoized)
    return (
        <EmptyStateWidget 
            type={type} 
            texts={currentTexts} 
            isRTL={isRTL} 
            onAction={handlePickFile} 
            onStorePress={() => router.push('/store')} 
        />
    );

  }, [isSearchMode, isLessonView, combinedLibrary.length, isRTL, emptyText, router]); // التبعيات الضرورية فقط
  
return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" />
        <View style={styles.bgGlow} />

        {/*  New Interactive Header with WorkLens Search */}
        <WorkspaceHeader 
            itemCount={combinedLibrary.length} 
            onSearch={performSearch}
            isSearching={isSearching}
            onClearSearch={handleClearSearch}
                onBack={() => router.back()} 

        />
        
        {/* Hide these elements when searching to focus on results */}
        {!isSearchMode && (
            <Animated.View entering={FadeIn} style={{ paddingHorizontal: 20, marginBottom: 10 }}>
                {/* جعلنا المكون قابلاً للضغط لفتح المودال */}
                <TouchableOpacity 
                    activeOpacity={0.8}
                    onPress={() => setStorageModalVisible(true)}
                >
                    <StorageStats used={storageUsage || "0 MB"} total="150 MB" />
                </TouchableOpacity>
            </Animated.View>
        )}

        {!isSearchMode && currentFolderId === null && activeSmartFilter === null ? (
            <FolderStrip 
                folders={folders}
                smartFolders={SMART_FOLDERS}
                libraryCount={combinedLibrary.length}
                onFolderPress={enterFolder}
                onCreatePress={() => { setFolderToEdit(null); setCreateFolderVisible(true); }}
                getFolderCount={(id) => combinedLibrary.filter(f => f.folder_id === id).length}
                onLongPress={handleFolderLongPress}
                onLayoutRegister={registerFolderLayout}
                hoveredFolderId={hoveredFolderId}
            />
        ) : !isSearchMode ? (
            <FolderNavigationHeader 
                title={currentFolderName}
                subtitle={isSubjectView ? 'Select Subject' : isLessonView ? 'Select Lesson' : `${displayedFiles.length} items`}
                onBack={goHome}
                onLayoutRegister={setBackButtonLayout}
                isHighlighted={isBackHovered}
            />
        ) : (
            // Header for Search Results
             <View style={styles.searchHeader}>
                <Text style={styles.searchText}>
                    {isSearching ? (t('searching') || 'Searching...') : 
                     searchResults.length > 0 ? (t('resultsFound', {count: searchResults.length}) || `${searchResults.length} Results Found`) : 
                     (t('noResults') || 'No results found')}
                </Text>
             </View>
        )}

        {/* Main Content List */}
         {isSubjectView ? (
            <FlatList
                key={'subjects-grid-3'} 
                data={subjectsList}
                keyExtractor={item => item.id}
                numColumns={3}
                contentContainerStyle={styles.listContent}
                columnWrapperStyle={{ gap: 5 }} 
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor="#38BDF8" />}
                ListEmptyComponent={<Text style={styles.emptyText}>{t('noSubjects') || "No subjects found"}</Text>}
                renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => enterFolder(item)} style={{ width: (width - 40) / 3 - 5, marginBottom: 20, alignItems: 'center' }}>
                        <ModernFolder name={item.title} count={0} scale={0.85} color={item.color_primary || '#6366f1'} isSmart={true} />
                    </TouchableOpacity>
                )}
            />
        ) : (
            <FlatList
                key={isLessonView ? 'list-1-col' : 'grid-files'}
                data={isLessonView ? lessonsList : displayedFiles}
                // ✅ التصحيح: نستخدم الدالة الذكية فقط ونحذف التكرار
                ListEmptyComponent={renderEmptyState}
                keyExtractor={item => item.id.toString()}
                numColumns={numColumns}
                contentContainerStyle={[styles.listContent, { flexGrow: 1 }]} 
                columnWrapperStyle={numColumns > 1 ? { justifyContent: 'space-between', flexDirection: isRTL ? 'row-reverse' : 'row' } : null}
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing} 
                        // Disable pull-to-refresh during search
                        enabled={!isSearchMode} 
                        onRefresh={isLessonView ? () => fetchLessonsForSubject(currentFolderId) : fetchData} 
                        tintColor="#38BDF8" 
                    />
                }
                renderItem={({ item, index }) => {
                    const isAudio = item.type === 'audio' || item.mime_type?.startsWith('audio');
                    
                    if (isLessonView) {
                        return (
                            <TouchableOpacity onPress={() => enterFolder(item)} style={[styles.lessonItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                <View style={styles.lessonIcon}><FontAwesome5 name="play" size={14} color="white" /></View>
                                <Text style={[styles.lessonTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{item.title || item.name}</Text>
                                <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color="#64748B" />
                            </TouchableOpacity>
                        );
                    } else {
                        // In search mode, disable drag to prevent confusion
                        if (isSearchMode) {
                             return <FileGridItem item={item} index={index} onPress={setSelectedFile} />;
                        }
                         if (isAudio) {
                             return (
                                 <DraggableItemWrapper
                                    item={item}
                                    isHidden={draggedItem && (draggedItem.id === item.id)}
                                    onDragStart={handleDragStart}
                                    onDragUpdate={handleDragUpdate}
                                    onDragEnd={handleDragEnd}
                                >
                                     <VinylAudioItem 
                                        item={item} 
                                        index={index} 
                                        onPress={(audioItem) => setSelectedAudio(audioItem)} 
                                     />
                                 </DraggableItemWrapper>
                             );
                        }

                        // ✅ للملفات الأخرى (PDF, Images) اعرض الكارد العادي
                        return (
                            <DraggableItemWrapper
                                item={item}
                                isHidden={draggedItem && (draggedItem.id === item.id)}
                                onDragStart={handleDragStart}
                                onDragUpdate={handleDragUpdate}
                                onDragEnd={handleDragEnd}
                            >
                                <FileGridItem item={item} index={index} onPress={setSelectedFile} />
                            </DraggableItemWrapper>
                        );
                    }
                }}
            />
        )}

        <AudioDetailModal 
            visible={!!selectedAudio}
            file={selectedAudio}
            onClose={() => setSelectedAudio(null)}
            onAction={(action, file) => {
                if (action === 'play_audio') {
                    // هنا سنقوم بتشغيل المشغل لاحقاً
                    Toast.show({ type: 'info', text1: 'Player coming soon' });
                } else {
                    // نمرر باقي الأكشن للدالة الرئيسية
                    setSelectedAudio(null); // أغلق مودال الصوت
                    // تأخير بسيط لفتح الأكشن التالي (حذف مثلاً)
                    setTimeout(() => {
                        if (action === 'delete') {
                            setSelectedFile(file); // لكي تعمل دالة الحذف على الملف الصحيح
                            handleFileAction('delete', file);
                        } else {
                            handleFileAction(action, file);
                        }
                    }, 100);
                }
            }}
        />
        
        <StorageDetailsModal 
            visible={isStorageModalVisible}
            onClose={() => setStorageModalVisible(false)}
            usedString={storageUsage || "0 MB"}
            fileCount={combinedLibrary.length}
        />

        {/* ✅ FAB Button (Hidden during search) */}
        {!activeSmartFilter && !isSearchMode && (
            <Animated.View 
                entering={ZoomIn.delay(300)} 
                exiting={ZoomOut}
                style={[styles.fabContainer, fabStyle, { [isRTL ? 'left' : 'right']: 20 }]}
            >
                <TouchableOpacity 
                    style={styles.fab} 
                    onPress={handlePickFile}
                    onPressIn={() => (fabScale.value = withSpring(0.9))}
                    onPressOut={() => (fabScale.value = withSpring(1))}
                    activeOpacity={0.8}
                >
                    <LinearGradient colors={['#38BDF8', '#2563EB']} style={styles.fabGradient}>
                        <FontAwesome5 name="cloud-upload-alt" size={22} color="white" />
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        )}

        {/* --- Overlays & Modals --- */}
        {renderUploadOverlay()}

        <CreateFolderModal 
            visible={isCreateFolderVisible} 
            onClose={closeCreateModal} 
            onSubmit={handleSaveFolder} 
            isLoading={isCreatingFolder}
            folderToEdit={folderToEdit} 
        />
        
        <UploadModal 
            visible={uploadModalVisible}
            file={pendingFile}
            onClose={() => setUploadModalVisible(false)}
            onConfirm={handleConfirmUpload}
        />

        <FileDetailModal 
            visible={!!selectedFile} 
            file={selectedFile} 
            isDeleting={isDeleting} 
            onClose={() => setSelectedFile(null)} 
            onAction={handleFileAction} 
        />

        <SecureFileViewer 
            visible={viewerVisible} 
            item={selectedFile || fileToView} 
            onClose={() => { setViewerVisible(false); setFileToView(null); }} 
        />
        
        <CustomAlert 
            isVisible={alertConfig.isVisible} 
            title={alertConfig.customTitle || t('delete')}
            message={alertConfig.customMessage || t('deleteConfirmMsg')}
            loading={isDeleting} 
            onClose={() => setAlertConfig({ isVisible: false, item: null, type: 'file' })} 
            buttons={[
                { text: t('cancel'), style: 'cancel', onPress: () => setAlertConfig({ isVisible: false, item: null, type: 'file' }) }, 
                { text: t('delete'), style: 'destructive', onPress: performDelete }
            ]} 
        />

        <FolderOptionsModal 
            visible={isOptionsVisible}
            folder={optionsFolder}
            onClose={() => setOptionsVisible(false)}
            onOpen={handleOptionOpen}
            onEdit={handleOptionEdit}
            onDelete={handleOptionDelete}
        />

        {draggedItem && (
          <Animated.View style={ghostStyle} pointerEvents="none">
             <FileGridItem item={draggedItem} index={0} onPress={() => {}} />
          </Animated.View>
        )}

      </SafeAreaView>
    </GestureHandlerRootView>
);}


// ✅ مكون منفصل للحالة الفارغة لمنع إعادة تشغيل اللوتي عند تحديث الصفحة
const EmptyStateWidget = React.memo(({ type, texts, isRTL, onAction, onStorePress }) => {
  const isZeroState = type === 'zero';
  const lottieSource = isZeroState 
    ? require('../../assets/images/havenoitem.json') 
    : require('../../assets/images/nofileshere.json');

  return (
    <View style={styles.emptyState}>
      <View style={styles.lottieContainer}>
        <LottieView
          source={lottieSource}
          autoPlay
          loop={isZeroState} 
          style={{ width: '100%', height: '100%' }}
          resizeMode="contain"
        />
      </View>
      
      <View style={styles.textContainer}>
        <Text style={styles.emptyTitle}>{texts.title}</Text>
        <Text style={styles.emptySubtitle}>{texts.subtitle}</Text>
      </View>
      
      {/* ✅ تعديل هنا: عرض الزرين بجانب بعضهما */}
      {isZeroState && (
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 12, marginTop: 25 }}>
            
            {/* زر الرفع (Primary) */}
            <TouchableOpacity style={styles.emptyActionBtn} onPress={onAction}>
                <FontAwesome5 name="cloud-upload-alt" size={14} color="#38BDF8" style={{ marginRight: isRTL ? 0 : 6, marginLeft: isRTL ? 6 : 0 }} />
                <Text style={styles.emptyActionText}>
                    {texts.btnUpload}
                </Text>
            </TouchableOpacity>

            {/* زر المتجر (Secondary/Outlined) */}
            <TouchableOpacity 
                style={[styles.emptyActionBtn, styles.storeBtn]} 
                onPress={onStorePress}
            >
                <FontAwesome5 name="store" size={14} color="#A78BFA" style={{ marginRight: isRTL ? 0 : 6, marginLeft: isRTL ? 6 : 0 }} />
                <Text style={[styles.emptyActionText, { color: '#A78BFA' }]}>
                    {texts.btnStore}
                </Text>
            </TouchableOpacity>

        </View>
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  return prevProps.type === nextProps.type && prevProps.texts.title === nextProps.texts.title;
});
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  bgGlow: { position: 'absolute', top: -100, left: -50, width: width, height: 400, backgroundColor: '#38BDF8', opacity: 0.05, borderRadius: 200, transform: [{ scaleX: 2 }] },
   
  listContent: { 
    paddingHorizontal: 20, 
    paddingBottom: 100, 
    paddingTop: 10,
  },

  // ✅ التعديل هنا لرفع المحتوى
  emptyState: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingHorizontal: 20,
    marginTop: 0, // إلغاء أي مسافة علوية زائدة
    minHeight: width * 0.7, // تقليل الارتفاع الأدنى قليلاً
    paddingBottom: 150, // 🔥 هذا السطر هو الأهم: يدفع المحتوى للأعلى بعيداً عن زر الإضافة
  },

  lottieContainer: {
    width: width * 0.8,  
    height: width * 0.65, 
    maxWidth: 350,       
    maxHeight: 300,
    marginBottom: -48,   // سحب النص للأعلى أكثر
  },


  // ✅ حاوية للنصوص لضبط المسافات بدقة
  textContainer: {
    alignItems: 'center',
    marginTop: 0, // إلغاء أي هوامش زائدة
  },

  emptyTitle: { 
    color: '#94A3B8', 
    marginTop: 0, 
    fontSize: width * 0.045, // حجم خط نسبي للشاشة
    fontWeight: 'bold', 
    textAlign: 'center',
  },

  emptySubtitle: { 
    color: '#64748B', 
    marginTop: 8, 
    fontSize: width * 0.035, // حجم خط نسبي
    textAlign: 'center', 
    lineHeight: 22,
    maxWidth: '80%' // منع النص من الوصول للحواف تماماً
  },

   emptyActionBtn: {
    // marginTop: 25,  <-- ⚠️ احذف هذا من هنا لأننا نقلناه للـ View الحاوية للأزرار
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    flexDirection: 'row', // لأجل الأيقونة
    alignItems: 'center'
  },
  
  // ✅ ستايل جديد لزر المتجر (بنفسجي)
  storeBtn: {
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    borderColor: 'rgba(167, 139, 250, 0.3)',
  },

  emptyActionText: {
    color: '#38BDF8',
    fontWeight: '600',
    fontSize: 14
  },
  lessonItem: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  lessonIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(56, 189, 248, 0.2)', justifyContent: 'center', alignItems: 'center', marginHorizontal: 12 },
  lessonTitle: { flex: 1, color: 'white', fontSize: 16, fontWeight: '500' },
  
  fabContainer: {
      position: 'absolute',
      bottom: 30,
      shadowColor: "#38BDF8",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
      elevation: 10,
      zIndex: 100
  },
  fab: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden' },
  fabGradient: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },

  progressContainer: {
    width: 250, padding: 20, borderRadius: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', overflow: 'hidden'
  },
  progressText: { color: 'white', fontWeight: 'bold', marginTop: 10, marginBottom: 10 },
  progressBarTrack: { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  
  searchHeader: { paddingHorizontal: 20, marginBottom: 10 },
  searchText: { color: '#94A3B8', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

});