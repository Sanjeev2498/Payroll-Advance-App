'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  Search,
  RefreshCw,
  Star
} from 'lucide-react';
import { format } from 'date-fns';
import { useApi } from '@/hooks/use-api';
import type { Shift, Employee, Assignment } from '@/types';

interface ShiftSwapDialogProps {
  open: boolean;
  onClose: () => void;
  shift: Shift | null;
  employees: Employee[];
  assignments: Assignment[];
  onSuccess: () => void;
}

const shiftSwapSchema = z.object({
  replacementType: z.enum(['ASSIGN_EMPLOYEE', 'FIND_COVERAGE', 'SWAP_SHIFT']),
  newAssignmentId: z.string().optional(),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  reason: z.string().min(1, 'Reason is required'),
  requiredSkills: z.array(z.string()).optional(),
  preferredEmployees: z.array(z.string()).optional(),
  deadline: z.string().optional(),
  notes: z.string().optional(),
});

type ShiftSwapForm = z.infer<typeof shiftSwapSchema>;

interface EmployeeMatch {
  employee: Employee;
  assignment: Assignment;
  matchScore: number;
  availability: 'AVAILABLE' | 'UNAVAILABLE' | 'PARTIAL' | 'UNKNOWN';
  conflicts: string[];
  skillMatch: number;
  distance?: number;
}

export function ShiftSwapDialog({
  open,
  onClose,
  shift,
  employees,
  assignments,
  onSuccess,
}: ShiftSwapDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);

  const form = useForm<ShiftSwapForm>({
    resolver: zodResolver(shiftSwapSchema),
    defaultValues: {
      replacementType: 'FIND_COVERAGE',
      urgency: 'MEDIUM',
      requiredSkills: [],
      preferredEmployees: [],
    },
  });

  const requestCoverageMutation = useApi<any>({
    endpoint: `/shifts/${shift?.id}/request-coverage`,
    method: 'POST',
  }) as any;

  const updateShiftMutation = useApi<any>({
    endpoint: `/shifts/${shift?.id}`,
    method: 'PATCH',
  }) as any;

  const replacementType = form.watch('replacementType');

  // Calculate employee matches for this shift
  const employeeMatches = useMemo((): EmployeeMatch[] => {
    if (!shift) return [];

    const siteAssignments = assignments.filter(a => a.siteId === shift.siteId && a.status === 'ACTIVE');
    
    return siteAssignments.map(assignment => {
      const employee = employees.find(e => e.id === assignment.employeeId);
      if (!employee) return null;

      // Calculate skill match
      const shiftSkills = shift.skillRequirements as string[] || [];
      const employeeSkills = employee.skills || [];
      const skillMatch = shiftSkills.length > 0 
        ? (shiftSkills.filter(skill => employeeSkills.includes(skill)).length / shiftSkills.length) * 100
        : 100;

      // Check availability (simplified - in real app would check actual availability)
      const availability = employee.employmentStatus === 'ACTIVE' ? 'AVAILABLE' : 'UNAVAILABLE';

      // Calculate conflicts (simplified)
      const conflicts: string[] = [];
      if (employee.employmentStatus !== 'ACTIVE') {
        conflicts.push('Not currently active');
      }

      // Calculate overall match score
      const matchScore = (skillMatch * 0.6) + 
                        (availability === 'AVAILABLE' ? 40 : 0) + 
                        (conflicts.length === 0 ? 0 : -20);

      return {
        employee,
        assignment,
        matchScore: Math.max(0, Math.min(100, matchScore)),
        availability,
        conflicts,
        skillMatch,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b!.matchScore - a!.matchScore) as EmployeeMatch[];
  }, [shift, employees, assignments]);

  // Filter matches based on search
  const filteredMatches = useMemo(() => {
    if (!searchTerm) return employeeMatches;
    
    const search = searchTerm.toLowerCase();
    return employeeMatches.filter(match => 
      `${match.employee.firstName} ${match.employee.lastName}`.toLowerCase().includes(search) ||
      match.employee.skills?.some(skill => skill.toLowerCase().includes(search))
    );
  }, [employeeMatches, searchTerm]);

  const handleSubmit = async (data: ShiftSwapForm) => {
    if (!shift) return;
    
    setIsSubmitting(true);
    try {
      if (data.replacementType === 'ASSIGN_EMPLOYEE' && data.newAssignmentId) {
        // Direct assignment
        await updateShiftMutation.mutateAsync({
          assignmentId: data.newAssignmentId,
          modificationReason: {
            action: 'ASSIGNMENT_CHANGED',
            reason: data.reason,
            changedBy: 'user', // This would come from auth context
          },
        });
      } else {
        // Request coverage
        await requestCoverageMutation.mutateAsync({
          urgency: data.urgency,
          reason: data.reason,
          requiredSkills: data.requiredSkills,
          preferredEmployees: data.preferredEmployees,
          deadline: data.deadline ? new Date(data.deadline) : undefined,
        });
      }

      onSuccess();
    } catch (error: any) {
      console.error('Failed to process shift swap:', error);
      // Handle error appropriately
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmployeeSelect = (employeeId: string) => {
    setSelectedEmployee(employeeId);
    const match = employeeMatches.find(m => m.employee.id === employeeId);
    if (match) {
      form.setValue('newAssignmentId', match.assignment.id);
      form.setValue('replacementType', 'ASSIGN_EMPLOYEE');
    }
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'AVAILABLE': return 'bg-green-100 text-green-800';
      case 'PARTIAL': return 'bg-yellow-100 text-yellow-800';
      case 'UNAVAILABLE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!shift) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Find Coverage for Shift
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Shift Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Shift Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Date:</span>
                  <span className="ml-2 font-medium">
                    {format(new Date(shift.shiftDate), 'PPP')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Time:</span>
                  <span className="ml-2 font-medium">
                    {new Date(`1970-01-01T${shift.startTime}`).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })} - 
                    {new Date(`1970-01-01T${shift.endTime}`).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Type:</span>
                  <span className="ml-2 font-medium">{shift.shiftType}</span>
                </div>
                <div>
                  <span className="text-gray-500">Coverage Required:</span>
                  <span className="ml-2 font-medium">{shift.coverageRequired}</span>
                </div>
              </div>
              {shift.skillRequirements && (shift.skillRequirements as string[]).length > 0 && (
                <div>
                  <span className="text-gray-500 text-sm">Required Skills:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(shift.skillRequirements as string[]).map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs value={replacementType === 'ASSIGN_EMPLOYEE' ? 'assign' : 'coverage'}>
            <TabsList>
              <TabsTrigger value="assign" onClick={() => form.setValue('replacementType', 'ASSIGN_EMPLOYEE')}>
                Direct Assignment
              </TabsTrigger>
              <TabsTrigger value="coverage" onClick={() => form.setValue('replacementType', 'FIND_COVERAGE')}>
                Request Coverage
              </TabsTrigger>
            </TabsList>

            <TabsContent value="assign" className="space-y-4">
              {/* Employee Search and Selection */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search employees by name or skills..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Employee Matches */}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {filteredMatches.map((match) => (
                    <Card
                      key={match.employee.id}
                      className={`cursor-pointer transition-colors ${
                        selectedEmployee === match.employee.id 
                          ? 'ring-2 ring-blue-500 bg-blue-50' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleEmployeeSelect(match.employee.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div>
                                <h4 className="font-medium">
                                  {match.employee.firstName} {match.employee.lastName}
                                </h4>
                                <p className="text-sm text-gray-600">{match.assignment.role}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={getAvailabilityColor(match.availability)}>
                                  {match.availability.toLowerCase()}
                                </Badge>
                                <div className={`text-sm font-medium ${getMatchScoreColor(match.matchScore)}`}>
                                  {Math.round(match.matchScore)}% match
                                </div>
                              </div>
                            </div>
                            
                            {match.employee.skills && match.employee.skills.length > 0 && (
                              <div className="mt-2">
                                <div className="flex flex-wrap gap-1">
                                  {match.employee.skills.map((skill) => (
                                    <Badge
                                      key={skill}
                                      variant="outline"
                                      className={`text-xs ${
                                        (shift.skillRequirements as string[] || []).includes(skill)
                                          ? 'bg-green-50 border-green-200 text-green-700'
                                          : ''
                                      }`}
                                    >
                                      {skill}
                                      {(shift.skillRequirements as string[] || []).includes(skill) && (
                                        <CheckCircle2 className="w-3 h-3 ml-1" />
                                      )}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {match.conflicts.length > 0 && (
                              <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                                <AlertCircle className="w-4 h-4" />
                                <span>{match.conflicts.join(', ')}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-500" />
                              <span className="text-sm font-medium">{Math.round(match.skillMatch)}%</span>
                            </div>
                            {selectedEmployee === match.employee.id && (
                              <UserCheck className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {filteredMatches.length === 0 && (
                    <div className="text-center p-8 text-gray-500">
                      No matching employees found for this shift
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="coverage" className="space-y-4">
              <Form {...form}>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="urgency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Urgency Level</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="LOW">Low - Can wait</SelectItem>
                            <SelectItem value="MEDIUM">Medium - Within 24 hours</SelectItem>
                            <SelectItem value="HIGH">High - Within 8 hours</SelectItem>
                            <SelectItem value="CRITICAL">Critical - Immediate</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deadline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Response Deadline (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </Form>
            </TabsContent>
          </Tabs>

          {/* Common Form Fields */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Coverage Request</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Please provide the reason for this coverage request..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any additional information or special requirements..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : replacementType === 'ASSIGN_EMPLOYEE' ? (
                    'Assign Employee'
                  ) : (
                    'Request Coverage'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
