// FIX: Define all necessary types for the application.

export type Answer = 'Sí' | 'No' | 'N/A' | null;

export interface AnswerData {
  answer: Answer;
  observation?: string;
}

export interface Answers {
  [key: number]: AnswerData;
}

export interface FormData {
  nombreAuditor: string;
  area: string;
  fecha: string;
}

export interface FormErrors {
  nombreAuditor?: string;
  area?: string;
  fecha?: string;
}

export interface CompletedAudit {
  auditData: FormData;
  answers: Answers;
}

export interface StatsByArea {
    name: string;
    'Sí': number;
    'No': number;
    'N/A': number;
}

export interface HistorySnapshot {
  name: string; // The date of the snapshot
  value: number; // The average compliance percentage
}