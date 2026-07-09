'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  AlertTriangle,
  MoreHorizontal,
  Edit,
  RefreshCw,
  Ban,
  UserPlus,
  FileText,
  CheckCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { useApi } from '@/hooks/use-api';
import type { Shift, Site, Employee, Assignment } from '@/types';

interface ShiftDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  shift: Shift | null;
  sites: Site[];
  employees: Employee[];
  assignments: Assignment[];
  onEdit: (shift: Shift) => void;
  onSwap: (shift: Shift) => void;
  onUpdate: () => void;
}

export function ShiftDetailsDialog({
  open,
  onClose,
  shift,
  sites,
  employees,
  assignments,
  onEdit,
  onSwap,
  onUpdate,
}: ShiftDetailsDialogProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateShiftMutation = useApi<any>({
    endpoint: `/shifts/${shift?.id}`,
    method: 'PATCH',
  }) as any;

  const cancelShiftMutation = useApi<any>({
    endpoint: `/shifts/${shift?.id}`,
    method: 'DELETE',
  }) as any;

  if (!shift) return null;

  const site = sites.find(s => s.id === shift.siteId);
  const assignment = shift.assignmentId ? assignments.find(a => a.id === shift.assignmentId) : null;
  const employee = assignment ? employees.find(e => e.id === assignment.employeeId) : null;

  const handleStatusUpdate = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      await updateShiftMutation.mutateAsync({
        status: newStatus,
        modificationReason: {
          action: 'STATUS_CHANGED',
          reason: `Status changed to ${newStatus}`,
          changedBy: 'user',
        },
      });
      onUpdate();
    } catch (error) {
      console.error('Failed to update shift status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelShift = async () => {
    if (!confirm('Are you sure you want to cancel this shift?')) return;

    setIsUpdating(true);
    try {
      await cancelShiftMutation.mutateAsync({
        params: {
          reason: 'Cancelled by user',
        },
      });
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Failed to cancel shift:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
      case 'CONFIRMED': return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED': return 'bg-gray-100 text-gray-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      case 'NEEDS_COVERAGE': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'bg-gray-100 text-gray-800';
      case 'NORMAL': return 'bg-blue-100 text-blue-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'URGENT': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canUpdateStatus = (currentStatus: string, targetStatus: string) => {
    const statusFlow: Record<string, string[]> = {
      'SCHEDULED': ['CONFIRMED', 'CANCELLED', 'NEEDS_COVERAGE'],
      'CONFIRMED': ['IN_PROGRESS', 'CANCELLED'],
      'IN_PROGRESS': ['COMPLETED', 'CANCELLED'],
      'NEEDS_COVERAGE': ['SCHEDULED', 'CONFIRMED', 'CANCELLED'],
      'COMPLETED': [],
      'CANCELLED': [],
    };
    
    return statusFlow[currentStatus]?.includes(targetStatus) || false;
  };

  const modificationLog = Array.isArray(shift.modificationLog) ? shift.modificationLog : [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Shift Details
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(shift.status)}>
                {shift.status.replace('_', ' ')}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isUpdating}>
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(shift)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Shift
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSwap(shift)}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Find Coverage
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {canUpdateStatus(shift.status, 'CONFIRMED') && (
                    <DropdownMenuItem onClick={() => handleStatusUpdate('CONFIRMED')}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirm Shift
                    </DropdownMenuItem>
                  )}
                  {canUpdateStatus(shift.status, 'IN_PROGRESS') && (
                    <DropdownMenuItem onClick={() => handleStatusUpdate('IN_PROGRESS')}>
                      <Clock className="w-4 h-4 mr-2" />
                      Mark In Progress
                    </DropdownMenuItem>
                  )}
                  {canUpdateStatus(shift.status, 'COMPLETED') && (
                    <DropdownMenuItem onClick={() => handleStatusUpdate('COMPLETED')}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark Completed
                    </DropdownMenuItem>
                  )}
                  {canUpdateStatus(shift.status, 'NEEDS_COVERAGE') && (
                    <DropdownMenuItem onClick={() => handleStatusUpdate('NEEDS_COVERAGE')}>
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Mark Needs Coverage
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleCancelShift}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    Cancel Shift
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>Site</span>
                  </div>
                  <p className="font-medium">{site?.name || 'Unknown Site'}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CalendarIcon className="w-4 h-4" />
                    <span>Date</span>
                  </div>
                  <p className="font-medium">
                    {format(new Date(shift.shiftDate), 'PPP')}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>Time</span>
                  </div>
                  <p className="font-medium">
                    {new Date(`1970-01-01T${shift.startTime}`).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })} - 
                    {new Date(`1970-01-01T${shift.endTime}`).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>Coverage</span>
                  </div>
                  <p className="font-medium">
                    {shift.coverageAssigned || 0} / {shift.coverageRequired} assigned
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div>
                  <span className="text-sm text-gray-600">Type:</span>
                  <Badge variant="secondary" className="ml-2">
                    {shift.shiftType}
                  </Badge>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Priority:</span>
                  <Badge className={`ml-2 ${getPriorityColor(shift.priority)}`}>
                    {shift.priority}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assignment Information */}
          {assignment && employee && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Assigned Employee</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">
                      {employee.firstName} {employee.lastName}
                    </h4>
                    <p className="text-sm text-gray-600">{assignment.role}</p>
                    <p className="text-xs text-gray-500">{employee.email}</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onSwap(shift)}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Replace
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Skill Requirements */}
          {shift.skillRequirements && (shift.skillRequirements as string[]).length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Skill Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(shift.skillRequirements as string[]).map((skill) => (
                    <Badge key={skill} variant="outline">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {shift.notes && (shift.notes as any).general && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{(shift.notes as any).general}</p>
              </CardContent>
            </Card>
          )}

          {/* Modification History */}
          {modificationLog.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Modification History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {modificationLog.map((entry: any, index: number) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{entry.action?.replace('_', ' ')}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(entry.timestamp).toLocaleString()}
                          </span>
                        </div>
                        {entry.reason && (
                          <p className="text-sm text-gray-600 mt-1">{entry.reason}</p>
                        )}
                        {entry.changedBy && (
                          <p className="text-xs text-gray-500">by {entry.changedBy}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {shift.status !== 'CANCELLED' && shift.status !== 'COMPLETED' && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => onEdit(shift)}
                  disabled={isUpdating}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Shift
                </Button>
                {(shift.status === 'NEEDS_COVERAGE' || !assignment) && (
                  <Button 
                    onClick={() => onSwap(shift)}
                    disabled={isUpdating}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Find Coverage
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}