import { User } from 'firebase/auth';

export type Language = 'es' | 'en' | 'fr' | 'de' | 'it' | 'ru' | 'zh';
export type Theme = 'light' | 'dark' | 'system';

export interface DetoxChallenge {
  id: string;
  title: string;
  totalDays: number;
  startDate: string; // ISO string YYYY-MM-DD
  isActive: boolean;
}

export interface Goal {
  id: number;
  text: string;
  category: string;
  completed: boolean;
  resourceKey: string;
}

export interface DailyLog {
  fecha: string;
  timestamp: number;
  // Metrics are now optional to allow gaps in data when disabled
  estado_animo?: number;
  calidad_sueno?: number;
  nivel_energia?: number;
  nivel_deporte?: number;
  social_confort?: number;
  nivel_motivacion?: number;
  nivel_concentracion?: number;
  regulacion_emocional?: number;
  
  reflexion: string;
  audio_note?: string; // Base64 encoded audio string
  progreso_porcentaje: number;
  objetivos_completados: { tarea: string; categoria: string }[];
  objetivos_pendientes: { tarea: string; categoria: string }[];
  
  // Security
  isEncrypted?: boolean;
}

export interface ResourceItem {
  title?: string;
  url?: string;
  time?: string;
  type?: string;
  tip?: string;
}

export interface ResourceData {
  task: string;
  type: 'book_recommendation' | 'list' | 'tip';
  data: ResourceItem | ResourceItem[];
}

export interface ViewProps {
  user: User | null;
  authUser: User | null;
  onAuthRequest: () => void;
  onNavigateToProfile: () => void;
  language: Language;
  onToggleLanguage: (lang: Language) => void;
  theme: Theme;
  onSetTheme: (theme: Theme) => void;
  isPro: boolean;
  onTogglePro: () => void;
  onLogout: () => void;
  // Shared Profile Props
  readOnly?: boolean;
  viewingFriendName?: string;
  onExitSharedView?: () => void;
}

export interface DashboardProps extends ViewProps {
  onBack: () => void;
  onNavigateToComments: () => void;
  onNavigateToClinicalMetrics: () => void;
}

export interface CanvasProps extends ViewProps {
  onNavigateToDashboard: () => void;
  onNavigateToComments: () => void;
  currentDate: string;
  onDateChange: (date: string) => void;
  showDevControls?: boolean;
}

export interface ReflectionsProps extends ViewProps {
  onBack: () => void;
}

export interface YearInPixelsProps extends ViewProps {
  onBack: () => void;
}

export interface ClinicalDashboardProps extends ViewProps {
  onBack: () => void;
}

export interface UserProfileProps extends ViewProps {
  onBack: () => void;
  onViewSharedProfile: (uid: string, name: string, email: string) => void;
  onShowRules?: () => void;
  onNavigateToYearPixels: () => void;
}

export interface OutgoingConnection {
  email: string;
  addedAt?: number;
}

export interface IncomingConnection {
  ownerUid: string;
  displayName?: string;
  email?: string;
  initial?: string;
}
