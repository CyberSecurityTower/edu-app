
import React, { createContext, useContext, useState, useCallback } from 'react';

const UIStateContext = createContext();

export const UIStateProvider = ({ children }) => {
  // --- States ---
  const [isChatPanelVisible, setIsChatPanelVisible] = useState(false);
  const [isTabBarVisible, setIsTabBarVisible] = useState(true);
  const [isAddTaskModalVisible, setIsAddTaskModalVisible] = useState(false);
  
  // Task Handler (لربط زر الإضافة في الفاب مع دالة الإضافة في صفحة المهام)
  const [taskUpdateHandler, setTaskUpdateHandler] = useState(null);

  // Alert Config
  const [alertConfig, setAlertConfig] = useState({
    isVisible: false,
    title: '',
    message: '',
    buttons: []
  });

  // --- Actions ---

  // 1. Chat Panel
  const openChatPanel = useCallback(() => {
    setIsChatPanelVisible(true);
    setIsTabBarVisible(false); // إخفاء التبويبات عند فتح الشات
  }, []);

  const closeChatPanel = useCallback(() => {
    setIsChatPanelVisible(false);
    setIsTabBarVisible(true); // إعادة التبويبات عند الإغلاق
  }, []);

  // 2. Add Task Modal
  const openAddTaskModal = useCallback(() => {
    setIsAddTaskModalVisible(true);
    setIsTabBarVisible(false);
  }, []);

  const closeAddTaskModal = useCallback(() => {
    setIsAddTaskModalVisible(false);
    setIsTabBarVisible(true);
  }, []);

  // 3. Custom Alert
  const showAlert = useCallback((title, message, buttons = []) => {
    setAlertConfig({ isVisible: true, title, message, buttons });
  }, []);

  const hideAlert = useCallback(() => {
    setAlertConfig(prev => ({ ...prev, isVisible: false }));
  }, []);

  return (
    <UIStateContext.Provider
      value={{
        // Chat
        isChatPanelVisible,
        openChatPanel,
        closeChatPanel,
        
        // Tab Bar
        isTabBarVisible,
        setIsTabBarVisible,

        // Add Task
        isAddTaskModalVisible,
        openAddTaskModal,
        closeAddTaskModal,
        
        // Task Handler Reference
        taskUpdateHandler,
        setTaskUpdateHandler,

        // Alert
        alertConfig,
        showAlert,
        hideAlert
      }}
    >
      {children}
    </UIStateContext.Provider>
  );
};

export const useUIState = () => useContext(UIStateContext);