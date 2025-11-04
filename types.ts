export type Answer = 'Sí' | 'No' | 'N/A';

export interface AnswerData {
  answer: Answer | null;
  observation?: string;
  photo?: string; // base64 string
}

export interface Answers {
  [questionIndex: number]: AnswerData;
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
  id: string;
  auditData: FormData;
  answers: Answers;
}

export interface HistorySnapshot {
    id?: string;
    name: string; // date string
    value: number; // compliance percentage
    created_at?: string;
}

export interface Question {
    id: number;
    text: string;
    is_active: boolean;
    display_order: number;
}

export interface Area {
    id: number;
    name: string;
    is_active: boolean;
}

export interface ExtinguisherArea {
  id: string;
  name: string;
  created_at: string;
}

export interface FirstAidKitArea {
  id: string;
  name: string;
  created_at: string;
}

export interface Extinguisher {
  id: string;
  area_id: string;
  location: string;
  series: string;
  type: string;
  capacity: string;
  created_at: string;
}

export type FirstAidKitAnswer = 'Sí' | 'No' | 'N/A';

export interface FirstAidKitAnswerData {
  answer: FirstAidKitAnswer | null;
  observation?: string;
  photo?: string;
}

export interface FirstAidKitAnswers {
  [questionIndex: number]: FirstAidKitAnswerData;
}

export interface FirstAidKit {
  id: string;
  area_id: string;
  location: string;
  inspection_data: FirstAidKitAnswers;
  created_at: string;
}


export interface StatsByArea {
  name: string;
  'Sí': number;
  'No': number;
  'N/A': number;
}

export type InspectionAnswer = 'Sí' | 'No' | 'N/A';

export interface InspectionAnswerData {
  answer: InspectionAnswer | null;
  observation?: string;
  photo?: string; // base64 string
}

export interface InspectionAnswers {
  [questionIndex: number]: InspectionAnswerData;
}

export interface InspectionRecord {
  id?: string;
  extinguisher_id: string;
  answers: InspectionAnswers;
  created_at?: string;
}