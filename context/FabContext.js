// context/FabContext.js
import React, { createContext, useContext, useState, useMemo } from 'react';

const FabContext = createContext(null);

export const useFab = () => useContext(FabContext);

export const FabProvider = ({ children }) => {
  // ✨ التغيير: بدلاً من إجراء واحد، أصبح لدينا مصفوفة من الإجراءات
  const [fabActions, setFabActions] = useState(null);
  const [isSheetVisible, setIsSheetVisible] = useState(false);

  const value = useMemo(() => ({
    fabActions,
    setFabActions,
    isSheetVisible,
    setIsSheetVisible,
  }), [fabActions, isSheetVisible]);

  return (
    <FabContext.Provider value={value}>
      {children}
    </FabContext.Provider>
  );
};