'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { X, Plus, Save, User, Briefcase, Award, MapPin, Phone, Mail, RefreshCw } from 'lucide-react'
import { employeesApi, CreateEmployeeDto, UpdateEmployeeDto, EmployeeResponseDto } from '@/lib/api/employees'

// Validation schema
const employeeSchema = z.object({
  employeeNumber: z.string().min(1, 'Employee number is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  hireDate: z.string().min(1, 'Hire date is required'),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY']).optional(),
  department: z.string().optional(),
  jobTitle: z.string().optional(),
  hourlyRate: z.number().min(0).optional(),
  // Contact Info
  primaryPhone: z.string().optional(),
  secondaryPhone: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactEmail: z.string().email().optional().or(z.literal('')),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  preferredContactMethod: z.enum(['EMAIL', 'PHONE', 'SMS']).optional()
})

type EmployeeFormData = z.infer<typeof employeeSchema>

interface EmployeeFormProps {
  employee?: EmployeeResponseDto
  onSave: (employee: EmployeeResponseDto) => void
  onCancel: () => void
}

export function EmployeeForm({ employee, onSave, onCancel }: EmployeeFormProps) {
  const [loading, setLoading] = useState(false)
  const [skills, setSkills] = useState<string[]>(
    employee?.skills?.map(s => typeof s === 'string' ? s : s.name) || []
  )
  const [newSkill, setNewSkill] = useState('')

  const isEditing = !!employee

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      employeeNumber: employee?.employeeNumber || '',
      firstName: employee?.firstName || '',
      lastName: employee?.lastName || '',
      email: employee?.email || '',
      phone: employee?.phone || '',
      hireDate: employee?.hireDate ? new Date(employee.hireDate).toISOString().split('T')[0] : '',
      employmentType: employee?.employmentType || undefined,
      department: employee?.department || '',
      jobTitle: employee?.jobTitle || '',
      hourlyRate: employee?.hourlyRate || undefined,
      // Contact info
      primaryPhone: employee?.contactInfo?.primaryPhone || employee?.phone || '',
      secondaryPhone: employee?.contactInfo?.secondaryPhone || '',
      emergencyContactName: employee?.contactInfo?.emergencyContact?.name || '',
      emergencyContactRelationship: employee?.contactInfo?.emergencyContact?.relationship || '',
      emergencyContactPhone: employee?.contactInfo?.emergencyContact?.phone || '',
      emergencyContactEmail: employee?.contactInfo?.emergencyContact?.email || '',
      street: employee?.contactInfo?.address?.street || '',
      city: employee?.contactInfo?.address?.city || '',
      state: employee?.contactInfo?.address?.state || '',
      zipCode: employee?.contactInfo?.address?.zipCode || '',
      country: employee?.contactInfo?.address?.country || 'USA',
      preferredContactMethod: employee?.contactInfo?.preferredContactMethod || 'EMAIL'
    }
  })

  const onSubmit = async (data: EmployeeFormData) => {
    try {
      setLoading(true)

      // Prepare the employee data
      const employeeData: CreateEmployeeDto | UpdateEmployeeDto = {
        employeeNumber: data.employeeNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        hireDate: data.hireDate,
        employmentType: data.employmentType,
        department: data.department || undefined,
        jobTitle: data.jobTitle || undefined,
        hourlyRate: data.hourlyRate || undefined,
        skills: skills.map(skill => ({
          name: skill,
          level: 'INTERMEDIATE' as const,
          certificationRequired: false
        })),
        contactInfo: {
          primaryPhone: data.primaryPhone || data.phone,
          secondaryPhone: data.secondaryPhone || undefined,
          emergencyContact: {
            name: data.emergencyContactName || '',
            relationship: data.emergencyContactRelationship || '',
            phone: data.emergencyContactPhone || '',
            email: data.emergencyContactEmail || undefined
          },
          address: {
            street: data.street || '',
            city: data.city || '',
            state: data.state || '',
            zipCode: data.zipCode || '',
            country: data.country || 'USA'
          },
          preferredContactMethod: data.preferredContactMethod || 'EMAIL'
        }
      }

      let savedEmployee: EmployeeResponseDto

      if (isEditing && employee) {
        savedEmployee = await employeesApi.updateEmployee(employee.id, employeeData as UpdateEmployeeDto)
      } else {
        savedEmployee = await employeesApi.createEmployee(employeeData as CreateEmployeeDto)
      }

      onSave(savedEmployee)
    } catch (error) {
      console.error('Failed to save employee:', error)
      // TODO: Show error notification
    } finally {
      setLoading(false)
    }
  }

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()])
      setNewSkill('')
    }
  }

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter(skill => skill !== skillToRemove))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {isEditing ? 'Edit Employee' : 'Add New Employee'}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={onCancel}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="employment">Employment</TabsTrigger>
                <TabsTrigger value="contact">Contact</TabsTrigger>
                <TabsTrigger value="skills">Skills</TabsTrigger>
              </TabsList>

              {/* Basic Information Tab */}
              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employeeNumber">Employee Number *</Label>
                    <Input
                      id="employeeNumber"
                      {...form.register('employeeNumber')}
                      disabled={isEditing} // Don't allow changing employee number when editing
                    />
                    {form.formState.errors.employeeNumber && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.employeeNumber.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hireDate">Hire Date *</Label>
                    <Input
                      id="hireDate"
                      type="date"
                      {...form.register('hireDate')}
                    />
                    {form.formState.errors.hireDate && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.hireDate.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      {...form.register('firstName')}
                    />
                    {form.formState.errors.firstName && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.firstName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      {...form.register('lastName')}
                    />
                    {form.formState.errors.lastName && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.lastName.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      {...form.register('email')}
                    />
                    {form.formState.errors.email && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      {...form.register('phone')}
                    />
                    {form.formState.errors.phone && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.phone.message}
                      </p>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Employment Details Tab */}
              <TabsContent value="employment" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employmentType">Employment Type</Label>
                    <Controller
                      name="employmentType"
                      control={form.control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select employment type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FULL_TIME">Full Time</SelectItem>
                            <SelectItem value="PART_TIME">Part Time</SelectItem>
                            <SelectItem value="CONTRACT">Contract</SelectItem>
                            <SelectItem value="TEMPORARY">Temporary</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                    <Input
                      id="hourlyRate"
                      type="number"
                      step="0.01"
                      min="0"
                      {...form.register('hourlyRate', { valueAsNumber: true })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      {...form.register('department')}
                      placeholder="e.g., Security, Administration"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Job Title</Label>
                    <Input
                      id="jobTitle"
                      {...form.register('jobTitle')}
                      placeholder="e.g., Security Guard, Supervisor"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Contact Information Tab */}
              <TabsContent value="contact" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primaryPhone">Primary Phone</Label>
                    <Input
                      id="primaryPhone"
                      {...form.register('primaryPhone')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secondaryPhone">Secondary Phone</Label>
                    <Input
                      id="secondaryPhone"
                      {...form.register('secondaryPhone')}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Emergency Contact</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emergencyContactName">Name</Label>
                      <Input
                        id="emergencyContactName"
                        {...form.register('emergencyContactName')}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="emergencyContactRelationship">Relationship</Label>
                      <Input
                        id="emergencyContactRelationship"
                        {...form.register('emergencyContactRelationship')}
                        placeholder="e.g., Spouse, Parent, Sibling"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emergencyContactPhone">Phone</Label>
                      <Input
                        id="emergencyContactPhone"
                        {...form.register('emergencyContactPhone')}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="emergencyContactEmail">Email</Label>
                      <Input
                        id="emergencyContactEmail"
                        type="email"
                        {...form.register('emergencyContactEmail')}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Address</h4>
                  <div className="space-y-2">
                    <Label htmlFor="street">Street Address</Label>
                    <Input
                      id="street"
                      {...form.register('street')}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        {...form.register('city')}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        {...form.register('state')}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="zipCode">ZIP Code</Label>
                      <Input
                        id="zipCode"
                        {...form.register('zipCode')}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preferredContactMethod">Preferred Contact Method</Label>
                  <Controller
                    name="preferredContactMethod"
                    control={form.control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select contact method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EMAIL">Email</SelectItem>
                          <SelectItem value="PHONE">Phone</SelectItem>
                          <SelectItem value="SMS">SMS</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </TabsContent>

              {/* Skills Tab */}
              <TabsContent value="skills" className="space-y-4">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Skills & Certifications</h4>
                  
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Add a skill..."
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addSkill()
                        }
                      }}
                    />
                    <Button type="button" onClick={addSkill} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {skill}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 w-4 h-4"
                          onClick={() => removeSkill(skill)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>

                  {skills.length === 0 && (
                    <p className="text-sm text-gray-500">No skills added yet</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>

          <div className="p-6 border-t bg-gray-50 flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
              <Save className="w-4 h-4 mr-2" />
              {isEditing ? 'Update Employee' : 'Create Employee'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}