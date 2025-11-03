import React, { createContext, useContext } from 'react';
import { CompletedAudit, HistorySnapshot, Question, Area } from '../types';

interface AppContextType {
  audits: CompletedAudit[];
  snapshots: HistorySnapshot[];
  questions: Question[];
  areas: Area[];
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = AppContext.Provider;

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext debe ser usado dentro de un AppProvider');
  }
  return context;
};
