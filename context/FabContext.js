import React, { createContext, useContext, useState, useMemo } from 'react';

const FabContext = createContext(null);

export const useFab = () => useContext(FabContext);

export const FabProvider = ({ children }) => {
  const [fabConfig, setFabConfig] = useState(null);
  const [isSheetVisible, setIsSheetVisible] = useState(false);

  const value = useMemo(() => ({
    fabConfig,
    setFabConfig,
    isSheetVisible,
    setIsSheetVisible,
  }), [fabConfig, isSheetVisible]);

  return (
    <FabContext.Provider value={value}>
      {children}
    </FabContext.Provider>
  );
};