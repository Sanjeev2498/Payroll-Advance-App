'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';

// Types based on the backend DTOs
export interface AttendanceRecord {
  id: string;
  shiftDate: string;
  siteName: string;
  clockIn: string | null;
  clockOut: string | null;
  hoursWorked: number;
  status: string;
  locationVerified: boolean;
  notes?: string;
}

export interface AttendanceSummary {
  totalDaysWorked: number;
  totalHoursWorked: number;
  overtimeHours: number;
  lateArrivals: number;
  earlyDepartures: number;
  attendanceRate: number;
}

export interface ShiftSchedule {
  id: string;
  siteName: string;
  siteAddress: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  shiftType: string;
  role: string;
  status: string;
  instructions?: string;
  requiresCheckIn: boolean;
}

export interface PayrollItem {
  id: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  grossPay: number;
  netPay: number;
  taxDeductions: number;
  otherDeductions: number;
  overtimePay: number;
  regularHours: number;
  overtimeHours: number;
  payslipUrl?: string;
  status: string;
  paidDate?: string;
}

export interface EmployeeDocument {
  id: string;
  name: string;
  type: string;
  description?: string;
  uploadedAt: string;
  downloadUrl: string;
  size: number;
  fileExtension: string;
}

export interface EmployeeNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: string;
  actionUrl?: string;
}

export interface EmployeeDashboard {
  currentShift?: ShiftSchedule;
  nextShift?: ShiftSchedule;
  todaysAttendance?: AttendanceRecord;
  attendanceSummary: AttendanceSummary;
  recentPayslips: PayrollItem[];
  unreadNotifications: number;
  upcomingShifts: ShiftSchedule[];
  clockStatus: {
    isClockedIn: boolean;
    lastAction?: string;
    lastActionTime?: string;
  };
}

export interface EmployeeProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  employeeNumber: string;
  hireDate: string;
  department?: string;
  jobTitle?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
    email?: string;
  };
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  notificationPreferences: {
    email: boolean;
    sms: boolean;
    pushNotifications: boolean;
  };
}

export function useEmployeePortal() {
  
  // State
  const [dashboard, setDashboard] = useState<EmployeeDashboard | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [shifts, setShifts] = useState<ShiftSchedule[]>([]);
  const [payroll, setPayroll] = useState<PayrollItem[]>([]);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [notifications, setNotifications] = useState<EmployeeNotification[]>([]);
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // API methods
  const fetchDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/employee-portal/dashboard');
      if (response.success) {
        setDashboard(response.data);
      } else {
        setError(response.error?.message || 'Failed to fetch dashboard');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAttendance = async (filter = 'this_month', startDate?: string, endDate?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ filter });
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await apiClient.get(`/employee-portal/attendance?${params.toString()}`);
      if (response.success) {
        setAttendanceRecords(response.data.records);
        setAttendanceSummary(response.data.summary);
      } else {
        setError(response.error?.message || 'Failed to fetch attendance');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchShifts = async (filter = 'upcoming', startDate?: string, endDate?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ filter });
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await apiClient.get(`/employee-portal/shifts?${params.toString()}`);
      if (response.success) {
        setShifts(response.data);
      } else {
        setError(response.error?.message || 'Failed to fetch shifts');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPayroll = async (year?: string, month?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (year) params.append('year', year);
      if (month) params.append('month', month);
      
      const response = await apiClient.get(`/employee-portal/payroll?${params.toString()}`);
      if (response.success) {
        setPayroll(response.data);
      } else {
        setError(response.error?.message || 'Failed to fetch payroll');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDocuments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/employee-portal/documents');
      if (response.success) {
        setDocuments(response.data);
      } else {
        setError(response.error?.message || 'Failed to fetch documents');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNotifications = async (unreadOnly = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = unreadOnly ? '?unreadOnly=true' : '';
      const response = await apiClient.get(`/employee-portal/notifications${params}`);
      if (response.success) {
        setNotifications(response.data);
      } else {
        setError(response.error?.message || 'Failed to fetch notifications');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/employee-portal/profile');
      if (response.success) {
        setProfile(response.data);
      } else {
        setError(response.error?.message || 'Failed to fetch profile');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updateData: Partial<EmployeeProfile>) => {
    setError(null);
    try {
      const response = await apiClient.patch('/employee-portal/profile', updateData);
      if (response.success) {
        await fetchProfile(); // Refresh profile data
        return true;
      } else {
        setError(response.error?.message || 'Failed to update profile');
        return false;
      }
    } catch (err) {
      setError('Network error');
      return false;
    }
  };

  const clockIn = async (shiftId: string, location?: any) => {
    setError(null);
    try {
      const response = await apiClient.post('/employee-portal/clock-in', { shiftId, location });
      if (response.success) {
        await fetchDashboard(); // Refresh dashboard to update clock status
        return true;
      } else {
        setError(response.error?.message || 'Failed to clock in');
        return false;
      }
    } catch (err) {
      setError('Network error');
      return false;
    }
  };

  const clockOut = async (shiftId: string, location?: any) => {
    setError(null);
    try {
      const response = await apiClient.post('/employee-portal/clock-out', { shiftId, location });
      if (response.success) {
        await fetchDashboard(); // Refresh dashboard to update clock status
        return true;
      } else {
        setError(response.error?.message || 'Failed to clock out');
        return false;
      }
    } catch (err) {
      setError('Network error');
      return false;
    }
  };

  const markNotificationRead = async (notificationId: string) => {
    setError(null);
    try {
      const response = await apiClient.post(`/employee-portal/notifications/${notificationId}/mark-read`);
      if (response.success) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
        );
        return true;
      } else {
        setError(response.error?.message || 'Failed to mark notification as read');
        return false;
      }
    } catch (err) {
      setError('Network error');
      return false;
    }
  };

  const downloadPayslip = async (payrollId: string) => {
    setError(null);
    try {
      const response = await apiClient.get(`/employee-portal/payroll/${payrollId}/download`);
      if (response.success) {
        // Open download URL in new tab
        window.open(response.data.downloadUrl, '_blank');
        return true;
      } else {
        setError(response.error?.message || 'Failed to download payslip');
        return false;
      }
    } catch (err) {
      setError('Network error');
      return false;
    }
  };

  // Load dashboard on mount
  useEffect(() => {
    fetchDashboard();
  }, []);

  return {
    // State
    dashboard,
    attendanceRecords,
    attendanceSummary,
    shifts,
    payroll,
    documents,
    notifications,
    profile,
    isLoading,
    error,
    
    // Methods
    fetchDashboard,
    fetchAttendance,
    fetchShifts,
    fetchPayroll,
    fetchDocuments,
    fetchNotifications,
    fetchProfile,
    updateProfile,
    clockIn,
    clockOut,
    markNotificationRead,
    downloadPayslip,
  };
}