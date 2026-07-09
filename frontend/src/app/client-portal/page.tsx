'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Users, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Download,
  MessageSquare,
  MapPin,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { ClientDashboard } from '@/components/client-portal/ClientDashboard';
import { GuardMonitoring } from '@/components/client-portal/GuardMonitoring';
import { AttendanceManagement } from '@/components/client-portal/AttendanceManagement';
import { InvoiceBilling } from '@/components/client-portal/InvoiceBilling';
import { ReportsAnalytics } from '@/components/client-portal/ReportsAnalytics';
import { Communication } from '@/components/client-portal/Communication';

export default function ClientPortalPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [clientData, setClientData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Mock client ID - in production, this would come from authentication
  const clientId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

  useEffect(() => {
    // Initialize client portal data
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Client Self-Service Portal</h1>
        <p className="text-gray-600">
          Monitor your security services, track attendance, manage billing, and access comprehensive reports
        </p>
      </div>

      {/* Main Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Guard Monitoring
          </TabsTrigger>
          <TabsTrigger value="attendance" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="communication" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Communication
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <ClientDashboard clientId={clientId} />
        </TabsContent>

        {/* Guard Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-6">
          <GuardMonitoring clientId={clientId} />
        </TabsContent>

        {/* Attendance Management Tab */}
        <TabsContent value="attendance" className="space-y-6">
          <AttendanceManagement clientId={clientId} />
        </TabsContent>

        {/* Invoice & Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          <InvoiceBilling clientId={clientId} />
        </TabsContent>

        {/* Reports & Analytics Tab */}
        <TabsContent value="reports" className="space-y-6">
          <ReportsAnalytics clientId={clientId} />
        </TabsContent>

        {/* Communication Tab */}
        <TabsContent value="communication" className="space-y-6">
          <Communication clientId={clientId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}