// context/AppStateContext.js
import { createContext, useContext } from 'react';

// 1. Create the context
const AppStateContext = createContext(null);

// 2. Create a custom hook for easy access
export function useAppState() {
  const context = useContext(AppStateContext);
  if (context === null) {
    throw new Error("useAppState must be used within an AppStateProvider");
  }
  return context;
}

// 3. Export the context itself for the provider
export default AppStateContext;