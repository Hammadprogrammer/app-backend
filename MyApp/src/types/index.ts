export interface User {
  id: string;
  name: string;
  phone: string;
  city?: string | null;
  email?: string | null;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  relation?: string | null;
  priority?: number;
  createdAt: string;
}

export type AlertStatus = 'PENDING' | 'SENT' | 'PARTIAL' | 'FAILED' | 'CANCELLED' | 'RESOLVED';

export interface Alert {
  id: string;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  message?: string | null;
  source?: string;
  status: AlertStatus;
  cancelledAt?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
}

export interface Checkin {
  id: string;
  type: string;
  label: string;
  status: 'safe' | 'not_safe';
  date: string;
  completedAt: string;
}

export interface AlarmSchedule {
  id: string;
  label: string;
  hour: number;
  minute: number;
  enabled: boolean;
  soundEnabled: boolean;
  sortOrder: number;
}

export interface ScoreFactor {
  label: string;
  points: number;
  maxPoints: number;
  completed: boolean;
}

export interface SafetyScore {
  score: number;
  label: string;
  factors: ScoreFactor[];
  streak: number;
  weekCheckins: number;
  safeCount: number;
  notSafeCount: number;
  totalToday: number;
  contactCount: number;
}

export interface StreakData {
  currentStreak: number;
  bestStreak: number;
  lastFullDate: string | null;
  todayCheckedIn: boolean;
  todayCheckInTime: string | null;
  calendarHistory: { date: string; status: 'full' | 'today' | 'missed' }[];
  milestones: { milestone: number; unlocked: boolean }[];
  nextMilestone: number | null;
}

export interface Trip {
  id: string;
  destination: string;
  estimatedMinutes: number;
  status: 'active' | 'arrived' | 'overdue' | 'ended';
  overdueNotified: boolean;
  startedAt: string;
  endedAt?: string | null;
  dueAt?: string;
  overdue?: boolean;
}

export interface Settings {
  shakeToAlert: boolean;
  keepScreenOn: boolean;
  secretRecording: boolean;
  lowBatteryAlert: boolean;
  simChangeAlert: boolean;
  offlineDetection: boolean;
  countryCode: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface AuthData {
  user: User;
  token: string;
}

export interface SignupData {
  user: User;
}

export interface LoginStepData {
  otpRequired: boolean;
  phone: string;
}

export interface ContactsData {
  contacts: Contact[];
  max: number;
}

export interface AlertHistoryData {
  alerts: Alert[];
}
