'use client';

import { useState } from 'react';
import { Calendar, Users, DollarSign, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface CreatePayrollRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
}

export function CreatePayrollRunDialog({ open, onOpenChange, onSubmit }: CreatePayrollRunDialogProps) {
  const [formData, setFormData] = useState({
    runNumber: '',
    payPeriodStart: '',
    payPeriodEnd: '',
    payType: 'monthly', // monthly, weekly, bi-weekly
    includeOvertime: true,
    includeBonuses: true,
    includeDeductions: true,
    employeeIds: [] as string[],
    description: '',
    autoApprove: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.payPeriodStart) {
      newErrors.payPeriodStart = 'Start date is required';
    }
    
    if (!formData.payPeriodEnd) {
      newErrors.payPeriodEnd = 'End date is required';
    }

    if (formData.payPeriodStart && formData.payPeriodEnd) {
      const startDate = new Date(formData.payPeriodStart);
      const endDate = new Date(formData.payPeriodEnd);
      
      if (startDate >= endDate) {
        newErrors.payPeriodEnd = 'End date must be after start date';
      }

      // Check if period is reasonable (not too long)
      const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 35) {
        newErrors.payPeriodEnd = 'Pay period cannot exceed 35 days';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      // Reset form
      setFormData({
        runNumber: '',
        payPeriodStart: '',
        payPeriodEnd: '',
        payType: 'monthly',
        includeOvertime: true,
        includeBonuses: true,
        includeDeductions: true,
        employeeIds: [],
        description: '',
        autoApprove: false
      });
    } catch (error) {
      console.error('Failed to create payroll run:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateRunNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const sequence = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    const runNumber = `PAY-${year}-${month}-${sequence}`;
    
    setFormData({ ...formData, runNumber });
  };

  const setCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    
    setFormData({
      ...formData,
      payPeriodStart: startDate.toISOString().split('T')[0],
      payPeriodEnd: endDate.toISOString().split('T')[0]
    });
  };

  const calculatePayPeriod = () => {
    if (!formData.payPeriodStart || !formData.payPeriodEnd) return null;
    
    const startDate = new Date(formData.payPeriodStart);
    const endDate = new Date(formData.payPeriodEnd);
    const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      days: diffDays + 1,
      workingDays: Math.floor((diffDays + 1) * 5/7), // Approximate working days
      startDate: startDate.toLocaleDateString(),
      endDate: endDate.toLocaleDateString()
    };
  };

  const payPeriodInfo = calculatePayPeriod();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Payroll Run</DialogTitle>
          <DialogDescription>
            Set up a new payroll processing run for your employees
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="runNumber">Run Number</Label>
                  <div className="flex gap-2">
                    <Input
                      id="runNumber"
                      value={formData.runNumber}
                      onChange={(e) => setFormData({ ...formData, runNumber: e.target.value })}
                      placeholder="PAY-2024-01-001"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generateRunNumber}
                      size="sm"
                    >
                      Generate
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty for auto-generation
                  </p>
                </div>

                <div>
                  <Label htmlFor="payType">Pay Type</Label>
                  <Select value={formData.payType} onValueChange={(value) => setFormData({ ...formData, payType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="payPeriodStart">Pay Period Start *</Label>
                  <Input
                    id="payPeriodStart"
                    type="date"
                    value={formData.payPeriodStart}
                    onChange={(e) => setFormData({ ...formData, payPeriodStart: e.target.value })}
                    className={errors.payPeriodStart ? 'border-red-500' : ''}
                  />
                  {errors.payPeriodStart && (
                    <p className="text-xs text-red-500 mt-1">{errors.payPeriodStart}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="payPeriodEnd">Pay Period End *</Label>
                  <Input
                    id="payPeriodEnd"
                    type="date"
                    value={formData.payPeriodEnd}
                    onChange={(e) => setFormData({ ...formData, payPeriodEnd: e.target.value })}
                    className={errors.payPeriodEnd ? 'border-red-500' : ''}
                  />
                  {errors.payPeriodEnd && (
                    <p className="text-xs text-red-500 mt-1">{errors.payPeriodEnd}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={setCurrentMonth}
                >
                  Current Month
                </Button>
              </div>

              {payPeriodInfo && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Pay Period Summary</h4>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Total Days:</span>
                      <span className="font-medium ml-1">{payPeriodInfo.days}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Working Days:</span>
                      <span className="font-medium ml-1">~{payPeriodInfo.workingDays}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Period:</span>
                      <span className="font-medium ml-1">{payPeriodInfo.startDate} - {payPeriodInfo.endDate}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Calculation Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Calculation Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeOvertime"
                    checked={formData.includeOvertime}
                    onCheckedChange={(checked) => setFormData({ ...formData, includeOvertime: !!checked })}
                  />
                  <Label htmlFor="includeOvertime" className="font-medium">
                    Include Overtime
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeBonuses"
                    checked={formData.includeBonuses}
                    onCheckedChange={(checked) => setFormData({ ...formData, includeBonuses: !!checked })}
                  />
                  <Label htmlFor="includeBonuses" className="font-medium">
                    Include Bonuses & Incentives
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeDeductions"
                    checked={formData.includeDeductions}
                    onCheckedChange={(checked) => setFormData({ ...formData, includeDeductions: !!checked })}
                  />
                  <Label htmlFor="includeDeductions" className="font-medium">
                    Include Deductions (Tax, PF, ESI)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="autoApprove"
                    checked={formData.autoApprove}
                    onCheckedChange={(checked) => setFormData({ ...formData, autoApprove: !!checked })}
                  />
                  <Label htmlFor="autoApprove" className="font-medium">
                    Auto-approve after calculation
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employee Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Employee Selection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">All Active Employees</p>
                    <p className="text-sm text-gray-600">
                      Process payroll for all employees with active status
                    </p>
                  </div>
                  <Checkbox
                    checked={formData.employeeIds.length === 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFormData({ ...formData, employeeIds: [] });
                      }
                    }}
                  />
                </div>
                
                <p className="text-sm text-gray-500">
                  Advanced employee filtering will be available after creating the run
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add notes or special instructions for this payroll run..."
              rows={3}
            />
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800">Important Notes:</p>
              <ul className="mt-1 text-yellow-700 space-y-1">
                <li>• Ensure all attendance data is complete for the pay period</li>
                <li>• Review any pending leave applications or corrections</li>
                <li>• Payroll calculations are based on current employee rates and policies</li>
                <li>• This action will create a new payroll run that can be reviewed before approval</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? 'Creating...' : 'Create Payroll Run'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}