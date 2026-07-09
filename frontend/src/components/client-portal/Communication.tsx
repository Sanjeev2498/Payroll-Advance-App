'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, AlertTriangle, FileText, Send, Clock } from 'lucide-react';

interface CommunicationProps {
  clientId: string;
}

export function Communication({ clientId }: CommunicationProps) {
  const [newComplaint, setNewComplaint] = useState({
    type: '',
    subject: '',
    description: '',
    priority: 'MEDIUM',
    siteId: '',
  });

  const [newRequest, setNewRequest] = useState({
    type: '',
    title: '',
    description: '',
    urgency: 'MEDIUM',
    siteId: '',
  });

  // Mock data
  const recentIncidents = [
    {
      id: 'inc-1',
      type: 'SECURITY_BREACH',
      title: 'Unauthorized Access Attempt',
      siteName: 'Main Office',
      severity: 'HIGH',
      status: 'RESOLVED',
      reportedAt: '2024-01-15T14:30:00Z',
    },
  ];

  const complaints = [
    {
      id: 'comp-1',
      type: 'SERVICE_QUALITY',
      subject: 'Guard was late for shift',
      status: 'INVESTIGATING',
      priority: 'MEDIUM',
      submittedAt: '2024-01-15T09:00:00Z',
    },
  ];

  const serviceRequests = [
    {
      id: 'req-1',
      type: 'GUARD_REPLACEMENT',
      title: 'Additional guard needed for weekend',
      status: 'APPROVED',
      urgency: 'HIGH',
      submittedAt: '2024-01-14T15:30:00Z',
    },
  ];

  const handleComplaintSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting complaint:', newComplaint);
    // Reset form
    setNewComplaint({
      type: '',
      subject: '',
      description: '',
      priority: 'MEDIUM',
      siteId: '',
    });
  };

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting request:', newRequest);
    // Reset form
    setNewRequest({
      type: '',
      title: '',
      description: '',
      urgency: 'MEDIUM',
      siteId: '',
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'LOW': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RESOLVED': case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'INVESTIGATING': case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'SUBMITTED': case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Communication Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-sm text-gray-600">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Open Complaints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">2</div>
            <p className="text-sm text-gray-600">Under investigation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">1</div>
            <p className="text-sm text-gray-600">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24h</div>
            <p className="text-sm text-gray-600">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Submit Complaint */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Submit Complaint
          </CardTitle>
          <CardDescription>
            Report issues or concerns about service quality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleComplaintSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select 
                value={newComplaint.type} 
                onValueChange={(value) => setNewComplaint({...newComplaint, type: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select complaint type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SERVICE_QUALITY">Service Quality</SelectItem>
                  <SelectItem value="STAFF_BEHAVIOR">Staff Behavior</SelectItem>
                  <SelectItem value="BILLING_ISSUE">Billing Issue</SelectItem>
                  <SelectItem value="RESPONSE_TIME">Response Time</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>

              <Select 
                value={newComplaint.priority} 
                onValueChange={(value) => setNewComplaint({...newComplaint, priority: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Input
              placeholder="Subject/Title"
              value={newComplaint.subject}
              onChange={(e) => setNewComplaint({...newComplaint, subject: e.target.value})}
            />

            <Textarea
              placeholder="Detailed description of the issue"
              value={newComplaint.description}
              onChange={(e) => setNewComplaint({...newComplaint, description: e.target.value})}
              rows={4}
            />

            <Button type="submit" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Submit Complaint
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Submit Service Request */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Submit Service Request
          </CardTitle>
          <CardDescription>
            Request additional services or modifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRequestSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select 
                value={newRequest.type} 
                onValueChange={(value) => setNewRequest({...newRequest, type: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select request type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GUARD_REPLACEMENT">Guard Replacement</SelectItem>
                  <SelectItem value="ADDITIONAL_COVERAGE">Additional Coverage</SelectItem>
                  <SelectItem value="SCHEDULE_CHANGE">Schedule Change</SelectItem>
                  <SelectItem value="EQUIPMENT_REQUEST">Equipment Request</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>

              <Select 
                value={newRequest.urgency} 
                onValueChange={(value) => setNewRequest({...newRequest, urgency: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select urgency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="EMERGENCY">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Input
              placeholder="Request title"
              value={newRequest.title}
              onChange={(e) => setNewRequest({...newRequest, title: e.target.value})}
            />

            <Textarea
              placeholder="Detailed description of the request"
              value={newRequest.description}
              onChange={(e) => setNewRequest({...newRequest, description: e.target.value})}
              rows={4}
            />

            <Button type="submit" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Submit Request
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incident Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Recent Incidents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentIncidents.map((incident) => (
              <div key={incident.id} className="border rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-sm">{incident.title}</h4>
                  <Badge className={getSeverityColor(incident.severity)}>
                    {incident.severity}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{incident.siteName}</p>
                <div className="flex justify-between items-center mt-2">
                  <Badge className={getStatusColor(incident.status)}>
                    {incident.status}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {new Date(incident.reportedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Complaints */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              My Complaints
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {complaints.map((complaint) => (
              <div key={complaint.id} className="border rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-sm">{complaint.subject}</h4>
                  <Badge className={getSeverityColor(complaint.priority)}>
                    {complaint.priority}
                  </Badge>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <Badge className={getStatusColor(complaint.status)}>
                    {complaint.status}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {new Date(complaint.submittedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Service Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              My Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {serviceRequests.map((request) => (
              <div key={request.id} className="border rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-sm">{request.title}</h4>
                  <Badge className={getSeverityColor(request.urgency)}>
                    {request.urgency}
                  </Badge>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <Badge className={getStatusColor(request.status)}>
                    {request.status}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {new Date(request.submittedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}