export interface CompanyInfo {
  name: string;
  address: string;
  vat: string;
  email: string;
  accountantEmail: string;
  workingDays?: number[]; // Array of days (0=Sun, 1=Mon...) that are working days
  emailSubject?: string;
  emailTitle?: string;
}

export interface WeeklySchedule {
  // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  [key: number]: number; 
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  contractHoursWeekly: number;
  defaultSchedule: WeeklySchedule;
}

export interface TimeEntry {
  id: string;
  employeeId: string;
  date: string; // ISO YYYY-MM-DD
  hours: number;
}

export enum LeaveType {
  FERIE = 'Ferie',
  PERMESSO = 'Permesso',
  MALATTIA = 'Malattia'
}

export enum LeaveStatus {
  PENDING = 'In Attesa',
  APPROVED = 'Approvato',
  REJECTED = 'Rifiutato'
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  type: LeaveType;
  status: LeaveStatus;
  note?: string;
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  EMPLOYEES = 'EMPLOYEES',
  TIMESHEET = 'TIMESHEET',
  LEAVE = 'LEAVE',
  REPORTS = 'REPORTS',
  SETTINGS = 'SETTINGS'
}