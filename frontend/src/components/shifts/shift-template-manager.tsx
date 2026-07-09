'use client';

import { useState } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  BookTemplate,
  Copy,
  Edit,
  Trash2,
  Plus,
  Clock,
  Users,
  Star,
  Download,
  Upload
} from 'lucide-react';
import { useApi } from '@/hooks/use-api';
import type { Site, Assignment } from '@/types';

interface ShiftTemplateManagerProps {
  open: boolean;
  onClose: () => void;
  sites: Site[];
  assignments: Assignment[];
  onTemplateApply: (templateId: string) => void;
}

interface ShiftTemplate {
  id: string;
  name: string;
  description: string;
  siteId?: string;
  shiftType: 'REGULAR' | 'OVERTIME' | 'HOLIDAY' | 'EMERGENCY';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  startTime: string;
  endTime: string;
  coverageRequired: number;
  skillRequirements: string[];
  recurringPattern?: {
    type: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
    daysOfWeek?: number[];
    interval?: number;
  };
  isDefault: boolean;
  isPublic: boolean;
  tags: string[];
  usageCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const templateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  siteId: z.string().optional(),
  shiftType: z.enum(['REGULAR', 'OVERTIME', 'HOLIDAY', 'EMERGENCY']),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  coverageRequired: z.number().min(1, 'At least 1 person required'),
  skillRequirements: z.array(z.string()),
  recurringType: z.enum(['NONE', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY']).optional(),
  daysOfWeek: z.array(z.number()).optional(),
  isDefault: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

type TemplateForm = z.infer<typeof templateSchema>;

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

const daysOfWeekOptions = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export function ShiftTemplateManager({
  open,
  onClose,
  sites,
  assignments,
  onTemplateApply,
}: ShiftTemplateManagerProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ShiftTemplate | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const form = useForm<TemplateForm>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      shiftType: 'REGULAR',
      priority: 'NORMAL',
      coverageRequired: 1,
      skillRequirements: [],
      recurringType: 'NONE',
      daysOfWeek: [],
      isDefault: false,
      isPublic: false,
      tags: [],
    },
  });

  const templatesQuery = useApi<ShiftTemplate[]>({
    endpoint: '/shift-templates',
    params: {
      search: searchTerm || undefined,
      tags: selectedTags.length > 0 ? selectedTags.join(',') : undefined,
    },
  });

  const createTemplateMutation = useApi<any>({
    endpoint: '/shift-templates',
    method: 'POST',
  }) as any;

  const updateTemplateMutation = useApi<any>({
    endpoint: '/shift-templates',
    method: 'PUT',
  }) as any;

  const deleteTemplateMutation = useApi<any>({
    endpoint: '/shift-templates',
    method: 'DELETE',
  }) as any;

  const applyTemplateMutation = useApi<any>({
    endpoint: '/shift-templates/apply',
    method: 'POST',
  }) as any;

  const templates = (templatesQuery.data?.data as ShiftTemplate[]) || [];
  const loading = templatesQuery && 'isLoading' in templatesQuery ? templatesQuery.isLoading : false;

  const handleCreateTemplate = async (data: TemplateForm) => {
    try {
      const templateData = {
        ...data,
        recurringPattern: data.recurringType !== 'NONE' ? {
          type: data.recurringType,
          daysOfWeek: data.daysOfWeek,
        } : undefined,
      };

      await createTemplateMutation.mutateAsync(templateData);
      setShowCreateForm(false);
      form.reset();
      if ('refetch' in templatesQuery) {
        templatesQuery.refetch();
      }
    } catch (error) {
      console.error('Failed to create template:', error);
    }
  };

  const handleEditTemplate = (template: ShiftTemplate) => {
    setEditingTemplate(template);
    form.reset({
      name: template.name,
      description: template.description,
      siteId: template.siteId,
      shiftType: template.shiftType,
      priority: template.priority,
      startTime: template.startTime,
      endTime: template.endTime,
      coverageRequired: template.coverageRequired,
      skillRequirements: template.skillRequirements,
      recurringType: template.recurringPattern?.type || 'NONE',
      daysOfWeek: template.recurringPattern?.daysOfWeek || [],
      isDefault: template.isDefault,
      isPublic: template.isPublic,
      tags: template.tags,
    });
    setShowCreateForm(true);
  };

  const handleUpdateTemplate = async (data: TemplateForm) => {
    if (!editingTemplate) return;

    try {
      await updateTemplateMutation.mutateAsync({
        endpoint: `/shift-templates/${editingTemplate.id}`,
        data: {
          ...data,
          recurringPattern: data.recurringType !== 'NONE' ? {
            type: data.recurringType,
            daysOfWeek: data.daysOfWeek,
          } : undefined,
        },
      });

      setShowCreateForm(false);
      setEditingTemplate(null);
      form.reset();
      if ('refetch' in templatesQuery) {
        templatesQuery.refetch();
      }
    } catch (error) {
      console.error('Failed to update template:', error);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;

    try {
      await deleteTemplateMutation.mutateAsync({ endpoint: `/shift-templates/${templateId}` });
      if ('refetch' in templatesQuery) {
        templatesQuery.refetch();
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const handleApplyTemplate = async (template: ShiftTemplate) => {
    try {
      await applyTemplateMutation.mutateAsync({
        templateId: template.id,
        applyToDate: new Date().toISOString().split('T')[0],
      });
      onTemplateApply(template.id);
      onClose();
    } catch (error) {
      console.error('Failed to apply template:', error);
    }
  };

  const getSiteName = (siteId?: string) => {
    if (!siteId) return 'All Sites';
    return sites.find(site => site.id === siteId)?.name || 'Unknown Site';
  };

  const availableTags = Array.from(
    new Set(templates.flatMap(t => t.tags))
  ).sort();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <BookTemplate className="w-5 h-5" />
              Shift Template Manager
            </DialogTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Template
              </Button>
            </div>
          </div>
        </DialogHeader>

        {showCreateForm ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(editingTemplate ? handleUpdateTemplate : handleCreateTemplate)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Morning Security Shift" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="siteId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Site (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="All Sites" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">All Sites</SelectItem>
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
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe this template..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
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
                  name="endTime"
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
              </div>

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

              {/* Skill Requirements */}
              <div>
                <FormLabel>Skill Requirements</FormLabel>
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

              {/* Advanced Template Options */}
              <div className="space-y-4">
                <h3 className="font-medium">Advanced Options</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="isDefault"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Set as Default Template</FormLabel>
                          <p className="text-xs text-gray-500">
                            Use this template as the default for new shifts
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isPublic"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Share with Team</FormLabel>
                          <p className="text-xs text-gray-500">
                            Allow other team members to use this template
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Auto-scheduling preferences */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Auto-Scheduling Preferences</h4>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 text-sm">
                      <input type="checkbox" className="rounded border-gray-300" />
                      <span>Prefer employees with matching skills</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm">
                      <input type="checkbox" className="rounded border-gray-300" />
                      <span>Consider proximity to site</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm">
                      <input type="checkbox" className="rounded border-gray-300" />
                      <span>Avoid overtime when possible</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm">
                      <input type="checkbox" className="rounded border-gray-300" />
                      <span>Auto-notify when coverage needed</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingTemplate(null);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex gap-4">
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              {availableTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <Button
                      key={tag}
                      size="sm"
                      variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                      onClick={() => {
                        if (selectedTags.includes(tag)) {
                          setSelectedTags(prev => prev.filter(t => t !== tag));
                        } else {
                          setSelectedTags(prev => [...prev, tag]);
                        }
                      }}
                    >
                      {tag}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base flex items-center gap-2">
                          {template.name}
                          {template.isDefault && (
                            <Star className="w-4 h-4 text-yellow-500" />
                          )}
                        </CardTitle>
                        <p className="text-sm text-gray-600">{getSiteName(template.siteId)}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditTemplate(template)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteTemplate(template.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {template.startTime} - {template.endTime}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {template.coverageRequired}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary">{template.shiftType}</Badge>
                      <Badge variant="outline">{template.priority}</Badge>
                      {template.isPublic && (
                        <Badge className="bg-blue-100 text-blue-800">Shared</Badge>
                      )}
                    </div>

                    {template.skillRequirements.length > 0 && (
                      <div className="text-sm">
                        <span className="font-medium">Skills: </span>
                        {template.skillRequirements.slice(0, 2).join(', ')}
                        {template.skillRequirements.length > 2 && (
                          <span className="text-gray-500"> +{template.skillRequirements.length - 2} more</span>
                        )}
                      </div>
                    )}

                    {template.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {template.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Used {template.usageCount} times</span>
                      <span>{new Date(template.updatedAt).toLocaleDateString()}</span>
                    </div>

                    <Button
                      className="w-full"
                      size="sm"
                      onClick={() => handleApplyTemplate(template)}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Apply Template
                    </Button>
                  </CardContent>
                </Card>
              ))}

              {templates.length === 0 && !loading && (
                <div className="col-span-full text-center py-8 text-gray-500">
                  <BookTemplate className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No templates found</p>
                  <Button
                    variant="outline"
                    className="mt-2"
                    onClick={() => setShowCreateForm(true)}
                  >
                    Create your first template
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
