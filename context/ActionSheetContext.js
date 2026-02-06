// context/ActionSheetContext.js
import React, { createContext, useContext, useState, useRef, useMemo, useCallback } from 'react';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { View } from 'react-native';

const ActionSheetContext = createContext(null);

export const useActionSheet = () => useContext(ActionSheetContext);

export const ActionSheetProvider = ({ children }) => {
  const [sheetContent, setSheetContent] = useState(null);
  const sheetRef = useRef(null);
  const snapPoints = useMemo(() => ['35%'], []);

  const openSheet = (content) => {
    setSheetContent(content);
    sheetRef.current?.expand();
  };

  const closeSheet = () => {
    sheetRef.current?.close();
  };
  
  // CRITICAL FIX: Custom Backdrop to handle taps for dismissal
  const CustomBackdrop = useCallback((props) => (
    <BottomSheetBackdrop 
      {...props} 
      disappearsOnIndex={-1} 
      appearsOnIndex={0} 
      opacity={0.7}
      pressBehavior='close' // Ensures tapping outside closes the sheet
    />
  ), []);

  const value = useMemo(() => ({ openSheet, closeSheet }), []);

  return (
    <ActionSheetContext.Provider value={value}>
      {children}
      
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: '#1E293B' }}
        handleIndicatorStyle={{ backgroundColor: '#64748B' }}
        onClose={() => setSheetContent(null)}
        BackdropComponent={CustomBackdrop} // Use the custom backdrop
      >
        {sheetContent && <View style={{ flex: 1 }}>{sheetContent}</View>}
      </BottomSheet>
    </ActionSheetContext.Provider>
  );
};