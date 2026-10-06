// TypeScript type definitions for RTO Pollution Van Manager

export type Role = 'ADMIN' | 'VAN_OPERATOR';
export type VanStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
export type ReportStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface User {
  id: string;
  firebase_uid: string;
  name: string;
  email: string;
  phone?: string | null;
  role: Role;
  van_id?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  van?: Van | null;
}

export interface Van {
  id: string;
  van_number: string; // "Van 01", "Van 02", "Van 03"
  registration_number: string; // "MH-12-DE-1001"
  operator_id?: string | null;
  status: VanStatus;
  created_at: string;
  updated_at: string;
  operator?: User | null;
}

export interface DailyReport {
  id: string;
  report_date: string; // YYYY-MM-DD (Asia/Kolkata date)
  van_id: string;
  operator_id: string;
  petrol_tests: number;
  diesel_tests: number;
  other_tests: number;
  total_tests: number;
  total_collection: number; // Stored as Decimal in DB, formatted as number or Decimal
  expenses: number;
  net_collection: number;
  notes?: string | null;
  submitted_at: string;
  updated_at: string;
  status: ReportStatus;
  van?: Van;
  operator?: User;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  metadata?: Record<string, any> | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeviceToken {
  id: string;
  user_id: string;
  token: string;
  platform?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLogItem {
  id: string;
  user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  metadata?: Record<string, any> | null;
  ip_address?: string | null;
  created_at: string;
  user?: {
    name: string;
    email: string;
    role: Role;
  } | null;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface AdminDashboardData {
  today: {
    date: string; // YYYY-MM-DD
    total_collection: number;
    total_expenses: number;
    net_collection: number;
    total_tests: number;
    petrol_tests: number;
    diesel_tests: number;
    other_tests: number;
    active_vans: number;
    total_vans: number;
    submitted_reports: number;
    pending_reports: number;
    yesterday_collection?: number;
    vs_yesterday_formatted?: string;
    vs_yesterday_is_positive?: boolean;
  };
  van_performance: Array<{
    van_id: string;
    van_number: string;
    registration_number: string;
    operator_name?: string;
    status: VanStatus;
    report_status: 'SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'NO_REPORT';
    collection: number;
    tests: number;
    expenses: number;
    net: number;
    submitted_at?: string | null;
    report_id?: string | null;
  }>;
  weekly: {
    total_collection: number;
    total_tests: number;
    daily_average: number;
    best_day?: { date: string; collection: number };
    best_van?: { van_number: string; collection: number };
    vs_previous_week_formatted?: string;
    vs_previous_week_is_positive?: boolean;
    van_ranking?: Array<{
      rank: number;
      van_number: string;
      collection: number;
      tests: number;
    }>;
    days: Array<{
      date: string;
      day_name: string;
      total_tests: number;
      total_collection: number;
      expenses: number;
      net_collection: number;
      van_01_collection?: number;
      van_02_collection?: number;
      van_03_collection?: number;
    }>;
  };
  monthly: {
    month_name: string;
    total_collection: number;
    total_expenses: number;
    net_collection: number;
    total_tests: number;
    working_days: number;
    daily_average: number;
    best_van?: { van_number: string; collection: number };
    chart_data: Array<{
      date: string;
      day: number;
      collection: number;
      tests: number;
    }>;
  };
}
