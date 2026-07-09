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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
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

interface CreateShiftDialogProps {
  open: boolean;
  onClose: () => void;
  selectedDate?: Date | null;
  sites: Site[];
  assignments: Assignment[];
  onSuccess: () => void;
}

const createShiftSchema = z.object({
  siteId: z.string().min(1, 'Site is required'),
  assignmentId: z.string().optional(),
  shiftDate: z.date({
    required_error: 'Shift date is required',
  }),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  shiftType: z.enum(['REGULAR', 'OVERTIME', 'HOLIDAY', 'EMERGENCY']),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
  coverageRequired: z.number().min(1, 'At least 1 person required'),
  skillRequirements: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

type CreateShiftForm = z.infer<typeof createShiftSchema>;

export function CreateShiftDialog({
  open,
  onClose,
  selectedDate,
  sites,
  assignments,
  onSuccess,
}: CreateShiftDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateShiftForm>({
    resolver: zodResolver(createShiftSchema),
    defaultValues: {
      shiftDate: selectedDate || new Date(),
      shiftType: 'REGULAR',
      priority: 'NORMAL',
      coverageRequired: 1,
      skillRequirements: [],
    },
  });

  const createShiftMutation = useApi<any>({
    endpoint: '/shifts',
    method: 'POST',
  }) as any;

  const selectedSiteId = form.watch('siteId');
  const startTime = form.watch('startTime');
  const endTime = form.watch('endTime');

  // Filter assignments by selected site
  const siteAssignments = useMemo(() => {
    if (!selectedSiteId) return [];
    return assignments.filter(a => a.siteId === selectedSiteId && a.status === 'ACTIVE');
  }, [assignments, selectedSiteId]);

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

  const handleSubmit = async (data: CreateShiftForm) => {
    setIsSubmitting(true);
    try {
      await createShiftMutation.mutateAsync({
        ...data,
        shiftDate: format(data.shiftDate, 'yyyy-MM-dd'),
        assignmentId: data.assignmentId || undefined,
        skillRequirements: data.skillRequirements || [],
        notes: data.notes ? { general: data.notes } : {},
      });

      onSuccess();
    } catch (error: any) {
      console.error('Failed to create shift:', error);
      // Handle error appropriately
    } finally {
      setIsSubmitting(false);
    }
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
            <Plus className="w-5 h-5" />
            Create New Shift
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              
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
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={!selectedSiteId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="No specific assignment" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {siteAssignments.map((assignment) => (
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

              <FormField
                control={form.control}
                name="shiftDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shift Date</FormLabel>
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
            </div>

            {/* Shift Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Shift Details</h3>

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
                      placeholder="Additional notes or instructions for this shift..."
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
                {isSubmitting ? 'Creating...' : 'Create Shift'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}