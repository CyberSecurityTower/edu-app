// context/EditModeContext.js
import React, { createContext, useContext, useState, useMemo } from 'react';

const EditModeContext = createContext(null);

export const useEditMode = () => useContext(EditModeContext);

export const EditModeProvider = ({ children }) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  
  // يمكن استخدام هذا لتمرير الدوال من الشاشة إلى شريط الأدوات لاحقًا
  const [actions, setActions] = useState({ onPin: () => {}, onDelete: () => {} });

  const value = useMemo(() => ({
    isEditMode,
    setIsEditMode,
    selectedTasks,
    setSelectedTasks,
    actions,
    setActions,
  }), [isEditMode, selectedTasks, actions]);

  return (
    <EditModeContext.Provider value={value}>
      {children}
    </EditModeContext.Provider>
  );};