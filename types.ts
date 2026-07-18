
export interface Patient {
  name: string;
  age: number;
  symptoms: string[];
  detailedSymptoms?: string;
  notes?: string;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface AnalysisResult {
  risk_level: string;
  triage_color: 'red' | 'yellow' | 'green' | 'black' | 'gray'; // Added gray for pending
  findings: string;
  red_flags: string[];
  medical_recommendations?: string[];
}

export interface Report {
  id: string;
  patientName: string;
  patientAge: number;
  symptoms: string[];
  detailedSymptoms?: string;
  notes?: string;
  location?: {
    lat: number;
    lng: number;
  };
  analysisResult: AnalysisResult;
  imagePreviews: string[];
  createdAt: string;
  updatedAt: string; // To track changes for sync merging
  status: 'pending_analysis' | 'processed' | 'pending_sync';
  syncStatus: 'synced' | 'pending' | 'local_only'; // Detailed sync state
  clinicId?: string; // Grouping ID for cloud sync
  doctorComment?: string;
  paramedicSignature?: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface ImagePayload {
  data: string;
  mimeType: string;
}

export interface RegisteredUser {
  name: string;
  username: string;
  password: string;
  role: 'medic' | 'doctor';
}

export interface OfflineMessage {
  type: 'patient_handoff';
  timestamp: number;
  data: Report;
}