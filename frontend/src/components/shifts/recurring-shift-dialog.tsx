'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Trash2,
  Repeat,
  Users
} from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { useApi } from '@/hooks/use-api';
import type { Site, Assignment } from '@/types';

interface RecurringShiftDialogProps {
  open: boolean;
  onClose: () => void;
  sites: Site[];
  assignments: Assignment[];
  onSuccess: () => void;
}

const recurringShiftSchema = z.object({
  siteId: z.string().min(1, 'Site is required'),
  assignmentId: z.string().optional(),
  startDate: z.date({
    required_error: 'Start date is required',
  }),
  endDate: z.date().optional(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  shiftType: z.enum(['REGULAR', 'OVERTIME', 'HOLIDAY', 'EMERGENCY']),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
  coverageRequired: z.number().min(1, 'At least 1 person required'),
  recurrenceType: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM']),
  recurrenceInterval: z.number().min(1, 'Interval must be at least 1').optional(),
  daysOfWeek: z.array(z.number()).optional(),
  occurrences: z.number().min(1, 'At least 1 occurrence required').optional(),
  skipWeekends: z.boolean().optional(),
  skipHolidays: z.boolean().optional(),
  customExclusions: z.array(z.date()).optional(),
  skillRequirements: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

type RecurringShiftForm = z.infer<typeof recurringShiftSchema>;

export function RecurringShiftDialog({
  open,
  onClose,
  sites,
  assignments,
  onSuccess,
}: RecurringShiftDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState<number[]>([]);
  const [exclusionDates, setExclusionDates] = useState<Date[]>([]);

  const form = useForm<RecurringShiftForm>({
    resolver: zodResolver(recurringShiftSchema),
    defaultValues: {
      shiftType: 'REGULAR',
      priority: 'NORMAL',
      coverageRequired: 1,
      recurrenceType: 'WEEKLY',
      recurrenceInterval: 1,
      skipWeekends: false,
      skipHolidays: false,
      skillRequirements: [],
    },
  });

  const createBulkShiftsMutation = useApi<any>({
    endpoint: '/shifts/bulk',
    method: 'POST',
  }) as any;

  const recurrenceType = form.watch('recurrenceType');
  const startDate = form.watch('startDate');
  const startTime = form.watch('startTime');
  const endTime = form.watch('endTime');

  const daysOfWeekOptions = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
  ];

  const skillOptions = [
    'Armed Security',
    'Unarmed Security',
    'Access Control',
    'CCTV Monitoring',
    'Fire Safety',
    'First Aid',
    'Emergency Response',
    'Customer Service',
    'Patrol',
    'Reception',
  ];

  const handleSubmit = async (data: RecurringShiftForm) => {
    setIsSubmitting(true);
    try {
      const recurringPattern = {
        type: data.recurrenceType,
        interval: data.recurrenceInterval,
        daysOfWeek: recurrenceType === 'WEEKLY' || recurrenceType === 'CUSTOM' ? selectedDaysOfWeek : undefined,
        occurrences: data.occurrences,
        endDate: data.endDate,
      };

      const recurringOptions = {
        skipWeekends: data.skipWeekends,
        skipHolidays: data.skipHolidays,
        customExclusions: exclusionDates,
      };

      // Create the base shift data
      const baseShiftData = {
        siteId: data.siteId,
        assignmentId: data.assignmentId || undefined,
        shiftDate: format(data.startDate, 'yyyy-MM-dd'),
        startTime: data.startTime,
        endTime: data.endTime,
        shiftType: data.shiftType,
        priority: data.priority,
        coverageRequired: data.coverageRequired,
        isRecurring: true,
        recurringPattern,
        skillRequirements: data.skillRequirements || [],
        notes: data.notes ? { general: data.notes } : {},
      };

      // If using date range pattern
      if (recurrenceType === 'CUSTOM' && data.endDate) {
        await createBulkShiftsMutation.mutateAsync({
          dateRange: {
            startDate: format(data.startDate, 'yyyy-MM-dd'),
            endDate: format(data.endDate, 'yyyy-MM-dd'),
            daysOfWeek: selectedDaysOfWeek.length > 0 ? selectedDaysOfWeek : undefined,
          },
          siteId: data.siteId,
          shifts: [baseShiftData],
        });
      } else {
        // Create single recurring shift with pattern
        await createBulkShiftsMutation.mutateAsync({
          shifts: [baseShiftData],
        });
      }

      onSuccess();
    } catch (error: any) {
      console.error('Failed to create recurring shifts:', error);
      // Handle error appropriately
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDayOfWeekChange = (day: number, checked: boolean) => {
    if (checked) {
      setSelectedDaysOfWeek(prev => [...prev, day].sort());
    } else {
      setSelectedDaysOfWeek(prev => prev.filter(d => d !== day));
    }
  };

  const addExclusionDate = (date: Date | undefined) => {
    if (date && !exclusionDates.some(d => d.getTime() === date.getTime())) {
      setExclusionDates(prev => [...prev, date]);
    }
  };

  const removeExclusionDate = (date: Date) => {
    setExclusionDates(prev => prev.filter(d => d.getTime() !== date.getTime()));
  };

  const validateTimes = () => {
    if (startTime && endTime && startTime >= endTime) {
      form.setError('endTime', {
        type: 'manual',
        message: 'End time must be after start time',
      });
      return false;
    }
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="w-5 h-5" />
            Create Recurring Shifts
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Basic Shift Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Shift Details</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="siteId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Site</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select site" />
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
                  name="assignmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignment (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="No specific assignment" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {assignments
                            .filter(a => !form.watch('siteId') || a.siteId === form.watch('siteId'))
                            .map((assignment) => (
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            validateTimes();
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            validateTimes();
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="shiftType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shift Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
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
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
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

                <FormField
                  control={form.control}
                  name="coverageRequired"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coverage Required</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Recurrence Pattern */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Recurrence Pattern</h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="recurrenceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recurrence Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="DAILY">Daily</SelectItem>
                          <SelectItem value="WEEKLY">Weekly</SelectItem>
                          <SelectItem value="BIWEEKLY">Bi-weekly</SelectItem>
                          <SelectItem value="MONTHLY">Monthly</SelectItem>
                          <SelectItem value="CUSTOM">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {recurrenceType !== 'WEEKLY' && recurrenceType !== 'BIWEEKLY' && (
                  <FormField
                    control={form.control}
                    name="recurrenceInterval"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Interval</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder={`Every ${recurrenceType === 'DAILY' ? 'N days' : recurrenceType === 'MONTHLY' ? 'N months' : 'N units'}`}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
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

                <FormField
                  control={form.control}
                  name="endDate"
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
                                <span>No end date</span>
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
                            disabled={(date) => date < startDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {(recurrenceType === 'WEEKLY' || recurrenceType === 'CUSTOM') && (
                <div>
                  <FormLabel>Days of Week</FormLabel>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {daysOfWeekOptions.map((day) => (
                      <div key={day.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`day-${day.value}`}
                          checked={selectedDaysOfWeek.includes(day.value)}
                          onCheckedChange={(checked) => handleDayOfWeekChange(day.value, checked as boolean)}
                        />
                        <label htmlFor={`day-${day.value}`} className="text-sm">
                          {day.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="occurrences"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Occurrences (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Leave empty for ongoing"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Options and Exclusions */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Options & Exclusions</h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="skipWeekends"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Skip Weekends</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="skipHolidays"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Skip Holidays</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {/* Exclusion Dates */}
              <div>
                <FormLabel>Exclusion Dates</FormLabel>
                <div className="mt-2 space-y-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Exclusion Date
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        onSelect={addExclusionDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  
                  {exclusionDates.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {exclusionDates.map((date, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {format(date, 'MMM dd, yyyy')}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0"
                            onClick={() => removeExclusionDate(date)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Skill Requirements */}
            <div>
              <FormLabel>Skill Requirements (Optional)</FormLabel>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {skillOptions.map((skill) => (
                  <FormField
                    key={skill}
                    control={form.control}
                    name="skillRequirements"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(skill)}
                            onCheckedChange={(checked) => {
                              const value = field.value || [];
                              if (checked) {
                                field.onChange([...value, skill]);
                              } else {
                                field.onChange(value.filter(v => v !== skill));
                              }
                            }}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-normal">
                            {skill}
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes or instructions for these shifts..."
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
                {isSubmitting ? 'Creating...' : 'Create Recurring Shifts'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}