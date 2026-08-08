'use client'

import React, { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { X, Plus, Save, User, RefreshCw, FileText, Upload } from 'lucide-react'
import { employeesApi, CreateEmployeeDto, UpdateEmployeeDto, EmployeeResponseDto } from '@/lib/api/employees'

// Validation schema
const employeeSchema = z.object({
  employeeNumber: z.string().min(1, 'Employee number is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required').optional().or(z.literal('')),
  phone: z.string().regex(/^\+91[6-9]\d{9}$/, 'Phone must be +91 followed by 10 digits starting with 6-9').min(1, 'Phone number is required'),
  hireDate: z.string().min(1, 'Hire date is required'),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY']).optional(),
  department: z.string().optional(),
  jobTitle: z.string().optional(),
  hourlyRate: z.number().min(0).optional(),
  // Required Documents
  aadhaarNumber: z.string().min(1, 'Aadhaar number is required').regex(/^\d{12}$/, 'Aadhaar must be exactly 12 digits'),
  panNumber: z.string().min(1, 'PAN number is required').regex(/^[A-Z]{5}\d{4}[A-Z]$/, 'PAN format: ABCDE1234F'),
  accountNumber: z.string().min(1, 'Account number is required').regex(/^\d+$/, 'Account number must contain only digits'),
  ifscCode: z.string().min(1, 'IFSC code is required').regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'IFSC format: SBIN0001234'),
  photoUrl: z.string().optional(),
  // Contact Info
  primaryPhone: z.string().regex(/^[6-9]\d{9}$/, 'Enter 10 digits starting with 6, 7, 8, or 9').optional().or(z.literal('')),
  secondaryPhone: z.string().regex(/^[6-9]\d{9}$/, 'Enter 10 digits starting with 6, 7, 8, or 9').optional().or(z.literal('')),
  emergencyContactName: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
  emergencyContactPhone: z.string().regex(/^[6-9]\d{9}$/, 'Enter 10 digits starting with 6, 7, 8, or 9').optional().or(z.literal('')),
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

  // Prevent body scroll when modal is open
  React.useEffect(() => {
    document.body.style.overflow = 'hidden'
    
    // Test API connection
    const testConnection = async () => {
      try {
        console.log('🔗 Testing API connection...')
        const response = await fetch('http://localhost:3005/api/v1/employees/stats')
        if (response.ok) {
          console.log('✅ API connection successful')
        } else {
          console.error('❌ API connection failed:', response.status)
        }
      } catch (error) {
        console.error('❌ API connection error:', error)
      }
    }
    
    testConnection()
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      employeeNumber: employee?.employeeNumber || '',
      firstName: employee?.firstName || '',
      lastName: employee?.lastName || '',
      email: employee?.email || '',
      phone: employee?.phone?.startsWith('+91') ? employee.phone : (employee?.phone ? `+91${employee.phone}` : ''),
      hireDate: employee?.hireDate ? new Date(employee.hireDate).toISOString().split('T')[0] : '',
      employmentType: employee?.employmentType || undefined,
      department: employee?.department || '',
      jobTitle: employee?.jobTitle || '',
      hourlyRate: employee?.hourlyRate || undefined,
      // Documents
      aadhaarNumber: employee?.aadhaarNumber || '',
      panNumber: employee?.panNumber || '',
      accountNumber: employee?.accountNumber || '',
      ifscCode: employee?.ifscCode || '',
      photoUrl: employee?.photoUrl || '',
      // Contact info
      primaryPhone: employee?.contactInfo?.primaryPhone?.startsWith('+91') 
        ? employee.contactInfo.primaryPhone.substring(3)
        : (employee?.contactInfo?.primaryPhone || ''),
      secondaryPhone: employee?.contactInfo?.secondaryPhone?.startsWith('+91')
        ? employee.contactInfo.secondaryPhone.substring(3)
        : (employee?.contactInfo?.secondaryPhone || ''),
      emergencyContactName: employee?.contactInfo?.emergencyContact?.name || '',
      emergencyContactRelationship: employee?.contactInfo?.emergencyContact?.relationship || '',
      emergencyContactPhone: employee?.contactInfo?.emergencyContact?.phone?.startsWith('+91')
        ? employee.contactInfo.emergencyContact.phone.substring(3)
        : (employee?.contactInfo?.emergencyContact?.phone || ''),
      emergencyContactEmail: employee?.contactInfo?.emergencyContact?.email || '',
      street: employee?.contactInfo?.address?.street || '',
      city: employee?.contactInfo?.address?.city || '',
      state: employee?.contactInfo?.address?.state || '',
      zipCode: employee?.contactInfo?.address?.zipCode || '',
      country: employee?.contactInfo?.address?.country || 'India',
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
        email: data.email || undefined,
        phone: data.phone,
        hireDate: new Date(data.hireDate).toISOString(),
        employmentType: data.employmentType,
        department: data.department || undefined,
        jobTitle: data.jobTitle || undefined,
        hourlyRate: data.hourlyRate || undefined,
        // Required Documents
        aadhaarNumber: data.aadhaarNumber,
        panNumber: data.panNumber,
        accountNumber: data.accountNumber,
        ifscCode: data.ifscCode,
        photoUrl: data.photoUrl && data.photoUrl.trim() ? data.photoUrl : undefined,
        skills: skills.length > 0 ? skills.map(skill => ({
          name: skill,
          level: 'INTERMEDIATE' as const,
          certificationRequired: false
        })) : undefined
      }

      // Only add contactInfo if there's actually contact information to add
      const hasContactInfo = data.primaryPhone || data.secondaryPhone || 
                            data.emergencyContactName || data.emergencyContactPhone ||
                            data.street || data.city || data.state

      if (hasContactInfo) {
        const contactInfo: any = {}
        
        if (data.primaryPhone) contactInfo.primaryPhone = `+91${data.primaryPhone}`
        if (data.secondaryPhone) contactInfo.secondaryPhone = `+91${data.secondaryPhone}`
        
        if (data.emergencyContactName || data.emergencyContactPhone) {
          contactInfo.emergencyContact = {
            name: data.emergencyContactName || '',
            relationship: data.emergencyContactRelationship || '',
            phone: data.emergencyContactPhone ? `+91${data.emergencyContactPhone}` : '',
            ...(data.emergencyContactEmail && { email: data.emergencyContactEmail })
          }
        }
        
        if (data.street || data.city || data.state) {
          contactInfo.address = {
            street: data.street || '',
            city: data.city || '',
            state: data.state || '',
            zipCode: data.zipCode || '',
            country: data.country || 'India'
          }
        }
        
        if (data.preferredContactMethod) {
          contactInfo.preferredContactMethod = data.preferredContactMethod
        }
        
        employeeData.contactInfo = contactInfo
      }

      // Debug: Log the payload
      console.log('🚀 Sending employee data:', JSON.stringify(employeeData, null, 2))
      console.log('📞 Phone data being sent:', {
        phone: employeeData.phone,
        phoneLength: employeeData.phone?.length,
        primaryPhone: employeeData.contactInfo?.primaryPhone,
        secondaryPhone: employeeData.contactInfo?.secondaryPhone,
        emergencyPhone: employeeData.contactInfo?.emergencyContact?.phone,
        rawFormData: {
          phone: data.phone,
          primaryPhone: data.primaryPhone,
          secondaryPhone: data.secondaryPhone,
          emergencyContactPhone: data.emergencyContactPhone
        }
      })

      let savedEmployee: EmployeeResponseDto

      if (isEditing && employee) {
        savedEmployee = await employeesApi.updateEmployee(employee.id, employeeData as UpdateEmployeeDto)
      } else {
        savedEmployee = await employeesApi.createEmployee(employeeData as CreateEmployeeDto)
      }

      console.log('✅ Employee saved successfully:', savedEmployee)
      onSave(savedEmployee)
    } catch (error: any) {
      console.error('❌ Failed to save employee:', error)
      
      // Enhanced error logging
      if (error?.response) {
        console.error('🚨 API Response Error:', error.response.data)
        console.error('📊 Error status:', error.response.status)
        console.error('📋 Error headers:', error.response.headers)
      } else if (error?.request) {
        console.error('📡 Network Error:', error.request)
      } else {
        console.error('⚙️ Setup Error:', error?.message)
      }
      
      // TODO: Show error notification to user
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
    <>
      {/* Modal Overlay - Portal to document body */}
      <div className="fixed inset-0 z-[9999] overflow-hidden">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black bg-opacity-50"
          onClick={onCancel}
        />
        
        {/* Modal Container */}
        <div className="flex min-h-full items-center justify-center p-4">
          <Card className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden bg-white shadow-2xl">
            {/* Scrollable Content */}
            <div className="overflow-y-auto max-h-[90vh]">
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
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
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
                    <Label htmlFor="email">Email</Label>
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
                    <div className="flex">
                      <div className="flex items-center px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md">
                        <span className="text-gray-600 font-medium">+91</span>
                      </div>
                      <Input
                        id="phone"
                        className="rounded-l-none"
                        placeholder="Enter 10 digits (6-9xxxxxxx)"
                        {...form.register('phone', {
                          onChange: (e) => {
                            // Auto-format with +91 prefix: +919876543210
                            const value = e.target.value.replace(/\D/g, '').substring(0, 10);
                            form.setValue('phone', value ? `+91${value}` : '');
                          }
                        })}
                        value={form.watch('phone')?.replace('+91', '') || ''}
                      />
                    </div>
                    {form.formState.errors.phone && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.phone.message}
                      </p>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-red-600" />
                    <h4 className="font-medium text-gray-900">Required Documents</h4>
                    <span className="text-xs text-red-600 font-medium">* All fields required</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="aadhaarNumber">1. Aadhaar Card *</Label>
                      <Input
                        id="aadhaarNumber"
                        placeholder="123456789012 (12 digits)"
                        maxLength={12}
                        {...form.register('aadhaarNumber', {
                          onChange: (e) => {
                            // Only allow digits
                            const value = e.target.value.replace(/\D/g, '').substring(0, 12);
                            form.setValue('aadhaarNumber', value);
                          }
                        })}
                        value={form.watch('aadhaarNumber') || ''}
                      />
                      {form.formState.errors.aadhaarNumber && (
                        <p className="text-sm text-red-600">
                          {form.formState.errors.aadhaarNumber.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="panNumber">2. PAN Card *</Label>
                      <Input
                        id="panNumber"
                        placeholder="ABCDE1234F (Format)"
                        maxLength={10}
                        {...form.register('panNumber', {
                          onChange: (e) => {
                            // Auto-format PAN: ABCDE1234F
                            let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                            if (value.length <= 5) {
                              value = value.replace(/[^A-Z]/g, '');
                            } else if (value.length <= 9) {
                              value = value.substring(0, 5) + value.substring(5).replace(/[^0-9]/g, '');
                            } else if (value.length <= 10) {
                              value = value.substring(0, 5) + value.substring(5, 9) + value.substring(9).replace(/[^A-Z]/g, '');
                            }
                            form.setValue('panNumber', value.substring(0, 10));
                          }
                        })}
                        value={form.watch('panNumber') || ''}
                      />
                      {form.formState.errors.panNumber && (
                        <p className="text-sm text-red-600">
                          {form.formState.errors.panNumber.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="accountNumber">3. Bank Account No. *</Label>
                      <Input
                        id="accountNumber"
                        placeholder="1234567890123456"
                        {...form.register('accountNumber', {
                          onChange: (e) => {
                            // Only allow digits
                            const value = e.target.value.replace(/\D/g, '').substring(0, 20);
                            form.setValue('accountNumber', value);
                          }
                        })}
                        value={form.watch('accountNumber') || ''}
                      />
                      {form.formState.errors.accountNumber && (
                        <p className="text-sm text-red-600">
                          {form.formState.errors.accountNumber.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ifscCode">4. IFSC Code *</Label>
                      <Input
                        id="ifscCode"
                        placeholder="SBIN0001234"
                        maxLength={11}
                        {...form.register('ifscCode', {
                          onChange: (e) => {
                            // Auto-format IFSC: SBIN0001234
                            let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                            if (value.length <= 4) {
                              value = value.replace(/[^A-Z]/g, '');
                            } else if (value.length === 5 && value[4] !== '0') {
                              value = value.substring(0, 4) + '0';
                            } else if (value.length > 5) {
                              value = value.substring(0, 4) + '0' + value.substring(5).replace(/[^A-Z0-9]/g, '');
                            }
                            form.setValue('ifscCode', value.substring(0, 11));
                          }
                        })}
                        value={form.watch('ifscCode') || ''}
                      />
                      {form.formState.errors.ifscCode && (
                        <p className="text-sm text-red-600">
                          {form.formState.errors.ifscCode.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone-display">5. Phone No. *</Label>
                      <div className="flex">
                        <div className="flex items-center px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md">
                          <span className="text-gray-600 font-medium">+91</span>
                        </div>
                        <Input
                          id="phone-display"
                          className="rounded-l-none bg-gray-50"
                          disabled
                          value={form.watch('phone')?.replace('+91', '') || ''}
                          placeholder="Enter phone in Basic Info tab"
                        />
                      </div>
                      <p className="text-xs text-gray-600">This is the same phone field from Basic Info tab</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="photoUrl">6. Photo</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="photoUrl"
                          placeholder="Upload or enter photo URL"
                          {...form.register('photoUrl')}
                        />
                        <Button type="button" variant="outline" size="sm">
                          <Upload className="w-4 h-4" />
                        </Button>
                      </div>
                      {form.formState.errors.photoUrl && (
                        <p className="text-sm text-red-600">
                          {form.formState.errors.photoUrl.message}
                        </p>
                      )}
                      <p className="text-xs text-gray-600">Upload employee photo (Optional)</p>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                      </div>
                      <div>
                        <h5 className="font-medium text-blue-900 mb-1">Document Requirements</h5>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>• Aadhaar Card: Valid 12-digit number for identity verification</li>
                          <li>• PAN Card: Required for tax compliance and salary processing</li>
                          <li>• Bank Account: For salary payments and direct deposits</li>
                          <li>• IFSC Code: For bank transfers and verification</li>
                          <li>• Phone Number: For communication and OTP verification</li>
                          <li>• Photo: Employee identification (recommended)</li>
                        </ul>
                      </div>
                    </div>
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
                    <Label htmlFor="hourlyRate">Hourly Rate (₹)</Label>
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
                    <div className="flex">
                      <div className="flex items-center px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md">
                        <span className="text-gray-600 font-medium">+91</span>
                      </div>
                      <Input
                        id="primaryPhone"
                        className="rounded-l-none"
                        placeholder="Enter 10 digits (6-9xxxxxxx)"
                        {...form.register('primaryPhone', {
                          onChange: (e) => {
                            const value = e.target.value.replace(/\D/g, '').substring(0, 10);
                            // Ensure it starts with 6-9 for Indian mobile numbers
                            if (value.length > 0 && !/^[6-9]/.test(value)) {
                              return; // Don't update if first digit is not 6-9
                            }
                            form.setValue('primaryPhone', value);
                          }
                        })}
                        value={form.watch('primaryPhone') || ''}
                      />
                    </div>
                    {form.formState.errors.primaryPhone && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.primaryPhone.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secondaryPhone">Secondary Phone</Label>
                    <div className="flex">
                      <div className="flex items-center px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md">
                        <span className="text-gray-600 font-medium">+91</span>
                      </div>
                      <Input
                        id="secondaryPhone"
                        className="rounded-l-none"
                        placeholder="Enter 10 digits (6-9xxxxxxx)"
                        {...form.register('secondaryPhone', {
                          onChange: (e) => {
                            const value = e.target.value.replace(/\D/g, '').substring(0, 10);
                            // Ensure it starts with 6-9 for Indian mobile numbers
                            if (value.length > 0 && !/^[6-9]/.test(value)) {
                              return; // Don't update if first digit is not 6-9
                            }
                            form.setValue('secondaryPhone', value);
                          }
                        })}
                        value={form.watch('secondaryPhone') || ''}
                      />
                    </div>
                    {form.formState.errors.secondaryPhone && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.secondaryPhone.message}
                      </p>
                    )}
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
                      <div className="flex">
                        <div className="flex items-center px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md">
                          <span className="text-gray-600 font-medium">+91</span>
                        </div>
                        <Input
                          id="emergencyContactPhone"
                          className="rounded-l-none"
                          placeholder="Enter 10 digits (6-9xxxxxxx)"
                          {...form.register('emergencyContactPhone', {
                            onChange: (e) => {
                              const value = e.target.value.replace(/\D/g, '').substring(0, 10);
                              // Ensure it starts with 6-9 for Indian mobile numbers
                              if (value.length > 0 && !/^[6-9]/.test(value)) {
                                return; // Don't update if first digit is not 6-9
                              }
                              form.setValue('emergencyContactPhone', value);
                            }
                          })}
                          value={form.watch('emergencyContactPhone') || ''}
                        />
                      </div>
                      {form.formState.errors.emergencyContactPhone && (
                        <p className="text-sm text-red-600">
                          {form.formState.errors.emergencyContactPhone.message}
                        </p>
                      )}
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
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}