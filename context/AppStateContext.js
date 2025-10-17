// context/AppStateContext.js
import { createContext, useContext } from 'react';

const AppStateContext = createContext(null);

export function useAppState() {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error("useAppState must be used within an AppStateProvider");
  }
  return context;
}

export default AppStateContext;