// context/FabContext.js
import React, { createContext, useContext, useState, useMemo } from 'react';

const FabContext = createContext(null);

export const useFab = () => useContext(FabContext);

export const FabProvider = ({ children }) => {
  const [fabActions, setFabActions] = useState(null);

  // نستخدم useMemo لضمان عدم إعادة إنشاء الكائن في كل مرة
  const value = useMemo(() => ({
    fabActions,
    setFabActions,
  }), [fabActions]);

  return (
    <FabContext.Provider value={value}>
      {children}
    </FabContext.Provider>
  );
};