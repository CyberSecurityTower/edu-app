import { useState, useRef } from 'react';
import { Dimensions } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { apiService } from '../config/api';

const { width } = Dimensions.get('window');

export const useWorkspaceDrag = (
    currentFolderId, 
    activeSmartFilter, 
    onRefreshData, 
    t ,
    onOptimisticHide,
    fetchData
) => {
  // State
  const [draggedItem, setDraggedItem] = useState(null);
  const [hoveredFolderId, setHoveredFolderId] = useState(null); 
  
  // Layouts Storage
  const backButtonLayout = useRef(null);
  const folderLayouts = useRef({}); 

  // Reanimated Values
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);

  // --- Helpers ---
  const registerFolderLayout = (id, layout) => {
      folderLayouts.current[id] = layout;
  };

  const setBackLayout = (layout) => {
      backButtonLayout.current = layout;
  };

  // --- Handlers ---
  const handleDragStart = (item, coords) => {
    if (activeSmartFilter) {
        Toast.show({
            type: 'info',
            text1: t('readOnlyView'),
            text2: t('cannotEditSmartFolder')
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
    }
    const cardWidth = (width / 2) - 30; 
    dragX.value = coords.x - (cardWidth / 2); 
    dragY.value = coords.y - 80; 
    setDraggedItem(item); 
  };

  const handleDragUpdate = (absX, absY) => {
    if (!draggedItem) return;

    dragX.value = absX - ((width / 2) - 30) / 2;
    dragY.value = absY - 80;

    // 1. Move Back Logic
    if (currentFolderId && backButtonLayout.current) {
        const { x, y, width: bw, height: bh } = backButtonLayout.current;
        const padding = 30; 
        const isHovering = absX >= x - padding && absX <= x + bw + padding && absY >= y - padding && absY <= y + bh + padding;
        
        if (isHovering && hoveredFolderId !== 'BACK') {
            setHoveredFolderId('BACK');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else if (!isHovering && hoveredFolderId === 'BACK') {
            setHoveredFolderId(null);
        }
        return; 
    }

    // 2. Drop into Folder Logic (Root)
    if (!currentFolderId && !activeSmartFilter) {
        let foundFolderId = null;
        
        for (const [id, layout] of Object.entries(folderLayouts.current)) {
            const { x, y, width: w, height: h } = layout;
            const hitSlop = 20;

            if (
                absX >= x - hitSlop && 
                absX <= x + w + hitSlop && 
                absY >= y - hitSlop && 
                absY <= y + h + hitSlop
            ) {
                foundFolderId = id;
                break; 
            }
        }

        if (foundFolderId !== hoveredFolderId) {
            setHoveredFolderId(foundFolderId);
            if (foundFolderId) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
        }
    }
  };

  
  const handleDragEnd = async () => {
    if (!draggedItem) return;

    // A. Drop on Back Button
    if (hoveredFolderId === 'BACK' && currentFolderId) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        if (onOptimisticHide) onOptimisticHide(draggedItem.id);

        try {
            await apiService.moveFileToFolder(draggedItem.id, null); 
            Toast.show({ type: 'success', text1: t('moved'), text2: t('movedToRoot') });
            if (onRefreshData) onRefreshData();
        } catch (error) {
            Toast.show({ type: 'error', text1: t('error'), text2: 'Failed to move' });
        }
    } 
    // B. Drop inside a Folder
    else if (hoveredFolderId && hoveredFolderId !== 'BACK' && !currentFolderId) {
        
        // ✅ 1. Check if it is a Smart Folder (Protection Layer)
        if (hoveredFolderId.toString().startsWith('smart_')) {
            // Show Error
            Toast.show({
                type: 'info', // Changed to info/error
                text1: t('actionNotAllowed') || "Action not allowed",
                text2: t('cannotMoveToSystemFolder') || "You cannot move files to system folders."
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

            // Revert immediately
            setDraggedItem(null);
            setHoveredFolderId(null);
            dragX.value = 0;
            dragY.value = 0;
            return; // 🛑 Stop execution here
        }

        // Check if already in folder (edge case)
        if (draggedItem.folder_id === hoveredFolderId) {
             setDraggedItem(null);
             setHoveredFolderId(null);
             return;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Hide item (Optimistic UI)
        if (onOptimisticHide) onOptimisticHide(draggedItem.id);

        try {
            console.log(`Moving file ${draggedItem.id} to folder ${hoveredFolderId}`);
            await apiService.moveFileToFolder(draggedItem.id, hoveredFolderId);
            
            Toast.show({ 
                type: 'success', 
                text1: 'Moved!', 
                text2: `File moved to folder` 
            });
            
            if (onRefreshData) onRefreshData();
        } catch (error) {
            console.error(error);
            Toast.show({ type: 'error', text1: t('error'), text2: 'Failed to move file' });
        }
    }
    
    // Reset State
    setDraggedItem(null); 
    setHoveredFolderId(null);
    dragX.value = 0;
    dragY.value = 0;
  };

  return {
    draggedItem,
    dragX,
    dragY,
    hoveredFolderId, 
    setBackButtonLayout: setBackLayout,
    registerFolderLayout, 
    handleDragStart,
    handleDragUpdate,
    handleDragEnd
  };
};