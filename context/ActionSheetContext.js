// context/ActionSheetContext.js
import React, { createContext, useContext, useState, useRef, useMemo } from 'react';
import BottomSheet from '@gorhom/bottom-sheet';
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

  const value = { openSheet, closeSheet };

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
      >
        {sheetContent && <View style={{ flex: 1 }}>{sheetContent}</View>}
      </BottomSheet>
    </ActionSheetContext.Provider>
  );
};