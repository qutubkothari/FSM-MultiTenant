import { Salesman, Customer, Product, Visit, VisitFormData, MeetingType, NextActionType, PotentialLevel } from './database.types';

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

// Store Types
export interface AuthState {
  salesman: Salesman | null;
  isAuthenticated: boolean;
  login: (phone: string, name?: string) => Promise<void>;
  logout: () => void;
}

export interface VisitState {
  visits: Visit[];
  currentVisit: Partial<Visit> | null;
  isCreatingVisit: boolean;
  addVisit: (visit: VisitFormData) => Promise<void>;
  updateVisit: (id: string, visit: Partial<Visit>) => Promise<void>;
  fetchVisits: () => Promise<void>;
  startVisit: () => void;
  endVisit: () => void;
}

export interface OfflineState {
  pendingVisits: Visit[];
  isSyncing: boolean;
  lastSyncTime: string | null;
  addPendingVisit: (visit: Visit) => void;
  syncPendingVisits: () => Promise<void>;
}

// Navigation Types
export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  NewVisit: undefined;
  VisitHistory: undefined;
  VisitDetails: { visitId: string };
  Settings: undefined;
};

// Utility Types
export { Salesman, Customer, Product, Visit, VisitFormData, MeetingType, NextActionType, PotentialLevel };
