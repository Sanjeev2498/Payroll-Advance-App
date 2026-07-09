'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addDays, eachDayOfInterval } from 'date-fns';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  CalendarIcon,
  Copy,
  Trash2,
  Edit,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useApi } from '@/hooks/use-api';
import type { Shift, Site, Assignment } from '@/types';

const bulkOperationSchema = z.object({
  operation: z.enum(['copy', 'update', 'delete', 'reschedule']),
  targetDateRange: z.object({
    startDate: z.date(),
    endDate: z.date().optional(),
  }).optional(),
  updates: z.object({
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    shiftType: z.enum(['REGULAR', 'OVERTIME', 'HOLIDAY', 'EMERGENCY']).optional(),
    priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
    siteId: z.string().optional(),
    assignmentId: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
  reason: z.string().min(1, 'Reason is required'),
});

type BulkOperationForm = z.infer<typeof bulkOperationSchema>;

interface BulkShiftOperationsProps {
  open: boolean;
  onClose: () => void;
  selectedShifts: Shift[];
  sites: Site[];
  assignments: Assignment[];
  onSuccess: () => void;
}

interface ShiftPreview {
  shift: Shift;
  operation: string;
  changes: Record<string, any>;
}

export function BulkShiftOperations({
  open,
  onClose,
  selectedShifts,
  sites,
  assignments,
  onSuccess,
}: BulkShiftOperationsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewData, setPreviewData] = useState<ShiftPreview[]>([]);

  const form = useForm<BulkOperationForm>({
    resolver: zodResolver(bulkOperationSchema),
    defaultValues: {
      operation: 'update',
      reason: '',
    },
  });

  const bulkUpdateShiftsMutation = useApi<any>({
    endpoint: '/shifts/bulk-update',
    method: 'PATCH',
  }) as any;

  const bulkDeleteShiftsMutation = useApi<any>({
    endpoint: '/shifts/bulk-delete',
    method: 'DELETE',
  }) as any;

  const copyShiftsMutation = useApi<any>({
    endpoint: '/shifts/bulk-copy',
    method: 'POST',
  }) as any;

  const operation = form.watch('operation');
  const targetDateRange = form.watch('targetDateRange');

  const generatePreview = (data: BulkOperationForm): ShiftPreview[] => {
    const previews: ShiftPreview[] = [];

    selectedShifts.forEach((shift) => {
      const preview: ShiftPreview = {
        shift,
        operation: data.operation,
        changes: {},
      };

      switch (data.operation) {
        case 'copy':
          if (data.targetDateRange) {
            const { startDate, endDate } = data.targetDateRange;
            const targetDates = endDate 
              ? eachDayOfInterval({ start: startDate, end: endDate })
              : [startDate];
            
            targetDates.forEach((date) => {
              preview.changes[`copy_to_${format(date, 'yyyy-MM-dd')}`] = true;
            });
          }
          break;

        case 'update':
          if (data.updates) {
            Object.entries(data.updates).forEach(([key, value]) => {
              if (value !== undefined && value !== '') {
                preview.changes[key] = value;
              }
            });
          }
          break;

        case 'delete':
          preview.changes.deleted = true;
          break;

        case 'reschedule':
          if (data.targetDateRange?.startDate) {
            preview.changes.newDate = format(data.targetDateRange.startDate, 'yyyy-MM-dd');
          }
          break;
      }

      previews.push(preview);
    });

    return previews;
  };

  const handlePreview = () => {
    const data = form.getValues();
    const previews = generatePreview(data);
    setPreviewData(previews);
    setPreviewMode(true);
  };

  const handleSubmit = async (data: BulkOperationForm) => {
    setIsSubmitting(true);
    try {
      const shiftIds = selectedShifts.map(s => s.id);

      switch (data.operation) {
        case 'copy':
          if (data.targetDateRange) {
            const { startDate, endDate } = data.targetDateRange;
            await copyShiftsMutation.mutateAsync({
              shiftIds,
              targetDateRange: {
                startDate: format(startDate, 'yyyy-MM-dd'),
                endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
              },
              reason: data.reason,
            });
          }
          break;

        case 'update':
          await bulkUpdateShiftsMutation.mutateAsync({
            shiftIds,
            updates: data.updates || {},
            reason: data.reason,
          });
          break;

        case 'delete':
          await bulkDeleteShiftsMutation.mutateAsync({
            shiftIds,
            reason: data.reason,
          });
          break;

        case 'reschedule':
          if (data.targetDateRange?.startDate) {
            await bulkUpdateShiftsMutation.mutateAsync({
              shiftIds,
              updates: {
                shiftDate: format(data.targetDateRange.startDate, 'yyyy-MM-dd'),
              },
              reason: data.reason,
            });
          }
          break;
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Bulk operation failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSiteName = (siteId: string) => {
    return sites.find(site => site.id === siteId)?.name || 'Unknown Site';
  };

  const getAssignmentName = (assignmentId: string | null) => {
    if (!assignmentId) return null;
    const assignment = assignments.find(a => a.id === assignmentId);
    return assignment ? `${assignment.employee?.firstName} ${assignment.employee?.lastName} - ${assignment.role}` : null;
  };

  if (previewMode) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview Bulk Operation</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <h3 className="font-medium">Operation: {operation.toUpperCase()}</h3>
                <p className="text-sm text-gray-600">
                  Affecting {selectedShifts.length} shift(s)
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPreviewMode(false)}>
                  Back to Edit
                </Button>
                <Button onClick={form.handleSubmit(handleSubmit)} disabled={isSubmitting}>
                  {isSubmitting ? 'Processing...' : 'Confirm & Execute'}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {previewData.map((preview, index) => (
                <div key={`${preview.shift.id}-${index}`} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-medium">{getSiteName(preview.shift.siteId)}</h4>
                      <p className="text-sm text-gray-600">
                        {format(new Date(preview.shift.shiftDate), 'PPP')} • 
                        {preview.shift.startTime} - {preview.shift.endTime}
                      </p>
                    </div>
                    <Badge variant={operation === 'delete' ? 'destructive' : 'default'}>
                      {operation}
                    </Badge>
                  </div>

                  {Object.keys(preview.changes).length > 0 && (
                    <div className="mt-2 p-3 bg-gray-50 rounded">
                      <p className="text-sm font-medium mb-2">Changes:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(preview.changes).map(([key, value]) => (
                          <div key={key} className="text-sm">
                            <span className="font-medium">{key}:</span> 
                            <span className="ml-1">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5" />
            Bulk Shift Operations
          </DialogTitle>
        </DialogHeader>

            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm">
                  <strong>{selectedShifts.length} shift(s) selected</strong>
                </p>
                <div className="text-xs text-gray-600">
                  Est. impact: {selectedShifts.reduce((sum, shift) => {
                    const site = sites.find(s => s.id === shift.siteId);
                    return sum + (site ? 1 : 0);
                  }, 0)} site(s) affected
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedShifts.slice(0, 3).map((shift) => (
                  <Badge key={shift.id} variant="secondary">
                    {getSiteName(shift.siteId)} - {format(new Date(shift.shiftDate), 'MMM dd')}
                  </Badge>
                ))}
                {selectedShifts.length > 3 && (
                  <Badge variant="outline">+{selectedShifts.length - 3} more</Badge>
                )}
              </div>
              
              {/* Operation impact warnings */}
              {operation === 'delete' && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                  ⚠️ Deleting shifts may leave sites uncovered. Ensure replacements are in place.
                </div>
              )}
              {operation === 'update' && selectedShifts.some(s => s.status === 'IN_PROGRESS') && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                  ⚠️ Some shifts are currently in progress. Updates may affect active operations.
                </div>
              )}
            </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Operation Selection */}
            <FormField
              control={form.control}
              name="operation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Operation</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="copy">
                        <div className="flex items-center gap-2">
                          <Copy className="w-4 h-4" />
                          Copy to Other Dates
                        </div>
                      </SelectItem>
                      <SelectItem value="update">
                        <div className="flex items-center gap-2">
                          <Edit className="w-4 h-4" />
                          Update Shift Details
                        </div>
                      </SelectItem>
                      <SelectItem value="reschedule">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Reschedule to New Date
                        </div>
                      </SelectItem>
                      <SelectItem value="delete">
                        <div className="flex items-center gap-2">
                          <Trash2 className="w-4 h-4" />
                          Cancel/Delete Shifts
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Target Date Range (for copy and reschedule operations) */}
            {(operation === 'copy' || operation === 'reschedule') && (
              <div className="space-y-4">
                <h3 className="font-medium">
                  {operation === 'copy' ? 'Copy to Dates' : 'Reschedule to Date'}
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="targetDateRange.startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {operation === 'copy' ? 'Start Date' : 'New Date'}
                        </FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={`w-full pl-3 text-left font-normal ${
                                  !field.value && "text-muted-foreground"
                                }`}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {operation === 'copy' && (
                    <FormField
                      control={form.control}
                      name="targetDateRange.endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date (Optional)</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={`w-full pl-3 text-left font-normal ${
                                    !field.value && "text-muted-foreground"
                                  }`}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Single date copy</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => 
                                  date < (targetDateRange?.startDate || new Date())
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Update Fields (for update operation) */}
            {operation === 'update' && (
              <div className="space-y-4">
                <h3 className="font-medium">Update Fields</h3>
                <p className="text-sm text-gray-600">
                  Only fill the fields you want to update. Empty fields will be left unchanged.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="updates.startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="updates.endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="updates.shiftType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shift Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="No change" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="REGULAR">Regular</SelectItem>
                            <SelectItem value="OVERTIME">Overtime</SelectItem>
                            <SelectItem value="HOLIDAY">Holiday</SelectItem>
                            <SelectItem value="EMERGENCY">Emergency</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="updates.priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="No change" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="LOW">Low</SelectItem>
                            <SelectItem value="NORMAL">Normal</SelectItem>
                            <SelectItem value="HIGH">High</SelectItem>
                            <SelectItem value="URGENT">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="updates.siteId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Site</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="No change" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sites.map((site) => (
                            <SelectItem key={site.id} value={site.id}>
                              {site.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="updates.assignmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignment</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="No change" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {assignments.map((assignment) => (
                            <SelectItem key={assignment.id} value={assignment.id}>
                              {assignment.employee?.firstName} {assignment.employee?.lastName} - {assignment.role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="updates.notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Add notes (will replace existing notes)"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Reason (Required for all operations) */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Change</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Provide a reason for this bulk operation (required for audit trail)..."
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
              <Button
                type="button"
                variant="outline"
                onClick={handlePreview}
                disabled={isSubmitting}
              >
                Preview Changes
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                variant={operation === 'delete' ? 'destructive' : 'default'}
              >
                {isSubmitting ? 'Processing...' : `Execute ${operation.toUpperCase()}`}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}