'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/types';
import { EmployeeDashboard } from '@/components/employee-portal/EmployeeDashboard';
import { Loader2 } from 'lucide-react';

export default function EmployeePortalPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication and authorization
    const checkAuth = async () => {
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Check if user has employee portal access
      if (user.role === UserRole.EMPLOYEE || 
          user.role === UserRole.SUPERVISOR || 
          user.role === UserRole.MANAGER || 
          user.role === UserRole.COMPANY_ADMIN) {
        setIsAuthorized(true);
      } else {
        router.push('/dashboard');
      }
      setIsLoading(false);
    };
    
    checkAuth();
  }, [user, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access the employee portal.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <EmployeeDashboard />
    </div>
  );
}