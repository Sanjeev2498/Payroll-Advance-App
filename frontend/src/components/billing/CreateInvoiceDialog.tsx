'use client';

import { useState, useEffect } from 'react';
import { Calendar, FileText, DollarSign, Users, Calculator } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export function CreateInvoiceDialog({ open, onOpenChange, onSubmit }: CreateInvoiceDialogProps) {
  const [formData, setFormData] = useState({
    clientId: '',
    billingModel: 'hourly', // hourly, fixed, deployment
    billingPeriodStart: '',
    billingPeriodEnd: '',
    dueDate: '',
    paymentTerms: '30', // days
    notes: '',
    autoGenerate: true,
    template: 'standard'
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', description: 'Security Guard Services', quantity: 160, rate: 250, amount: 40000 }
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const tax = subtotal * 0.18; // 18% GST
    const total = subtotal + tax;
    
    return { subtotal, tax, total };
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.clientId) {
      newErrors.clientId = 'Client selection is required';
    }
    
    if (!formData.billingPeriodStart) {
      newErrors.billingPeriodStart = 'Billing period start is required';
    }
    
    if (!formData.billingPeriodEnd) {
      newErrors.billingPeriodEnd = 'Billing period end is required';
    }

    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    }

    if (formData.billingPeriodStart && formData.billingPeriodEnd) {
      const startDate = new Date(formData.billingPeriodStart);
      const endDate = new Date(formData.billingPeriodEnd);
      
      if (startDate >= endDate) {
        newErrors.billingPeriodEnd = 'End date must be after start date';
      }
    }

    if (lineItems.length === 0) {
      newErrors.lineItems = 'At least one line item is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const { subtotal, tax, total } = calculateTotals();
      
      await onSubmit({
        ...formData,
        lineItems,
        subtotal,
        tax,
        total,
        amount: total
      });
      
      // Reset form
      setFormData({
        clientId: '',
        billingModel: 'hourly',
        billingPeriodStart: '',
        billingPeriodEnd: '',
        dueDate: '',
        paymentTerms: '30',
        notes: '',
        autoGenerate: true,
        template: 'standard'
      });
      setLineItems([
        { id: '1', description: 'Security Guard Services', quantity: 160, rate: 250, amount: 40000 }
      ]);
    } catch (error) {
      console.error('Failed to create invoice:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addLineItem = () => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0
    };
    setLineItems([...lineItems, newItem]);
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(items => items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'rate') {
          updated.amount = updated.quantity * updated.rate;
        }
        return updated;
      }
      return item;
    }));
  };

  const removeLineItem = (id: string) => {
    setLineItems(items => items.filter(item => item.id !== id));
  };

  const generateDueDate = () => {
    if (formData.billingPeriodEnd && formData.paymentTerms) {
      const endDate = new Date(formData.billingPeriodEnd);
      const dueDate = new Date(endDate.getTime() + parseInt(formData.paymentTerms) * 24 * 60 * 60 * 1000);
      setFormData({ ...formData, dueDate: dueDate.toISOString().split('T')[0] });
    }
  };

  useEffect(() => {
    if (formData.billingPeriodEnd && formData.paymentTerms) {
      generateDueDate();
    }
  }, [formData.billingPeriodEnd, formData.paymentTerms]);

  const { subtotal, tax, total } = calculateTotals();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
          <DialogDescription>
            Generate an invoice for client billing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientId">Client *</Label>
                  <Select value={formData.clientId} onValueChange={(value) => setFormData({ ...formData, clientId: value })}>
                    <SelectTrigger className={errors.clientId ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client1">TechCorp Ltd</SelectItem>
                      <SelectItem value="client2">Secure Industries</SelectItem>
                      <SelectItem value="client3">Metro Solutions</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.clientId && (
                    <p className="text-xs text-red-500 mt-1">{errors.clientId}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="billingModel">Billing Model</Label>
                  <Select value={formData.billingModel} onValueChange={(value) => setFormData({ ...formData, billingModel: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly Rate</SelectItem>
                      <SelectItem value="fixed">Fixed Price</SelectItem>
                      <SelectItem value="deployment">Per Deployment</SelectItem>
                      <SelectItem value="monthly">Monthly Contract</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="billingPeriodStart">Billing Period Start *</Label>
                  <Input
                    id="billingPeriodStart"
                    type="date"
                    value={formData.billingPeriodStart}
                    onChange={(e) => setFormData({ ...formData, billingPeriodStart: e.target.value })}
                    className={errors.billingPeriodStart ? 'border-red-500' : ''}
                  />
                  {errors.billingPeriodStart && (
                    <p className="text-xs text-red-500 mt-1">{errors.billingPeriodStart}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="billingPeriodEnd">Billing Period End *</Label>
                  <Input
                    id="billingPeriodEnd"
                    type="date"
                    value={formData.billingPeriodEnd}
                    onChange={(e) => setFormData({ ...formData, billingPeriodEnd: e.target.value })}
                    className={errors.billingPeriodEnd ? 'border-red-500' : ''}
                  />
                  {errors.billingPeriodEnd && (
                    <p className="text-xs text-red-500 mt-1">{errors.billingPeriodEnd}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="dueDate">Due Date *</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className={errors.dueDate ? 'border-red-500' : ''}
                  />
                  {errors.dueDate && (
                    <p className="text-xs text-red-500 mt-1">{errors.dueDate}</p>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="paymentTerms">Payment Terms (Days)</Label>
                  <Select value={formData.paymentTerms} onValueChange={(value) => setFormData({ ...formData, paymentTerms: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 Days</SelectItem>
                      <SelectItem value="30">30 Days</SelectItem>
                      <SelectItem value="45">45 Days</SelectItem>
                      <SelectItem value="60">60 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="template">Invoice Template</Label>
                  <Select value={formData.template} onValueChange={(value) => setFormData({ ...formData, template: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard Template</SelectItem>
                      <SelectItem value="detailed">Detailed Template</SelectItem>
                      <SelectItem value="minimal">Minimal Template</SelectItem>
                      <SelectItem value="branded">Branded Template</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Line Items
                </CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {lineItems.map((item, index) => (
                <div key={item.id} className="grid md:grid-cols-6 gap-4 items-end p-4 border rounded-lg">
                  <div className="md:col-span-2">
                    <Label>Description</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                      placeholder="Service description"
                    />
                  </div>
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label>Rate (₹)</Label>
                    <Input
                      type="number"
                      value={item.rate}
                      onChange={(e) => updateLineItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label>Amount (₹)</Label>
                    <Input
                      value={item.amount.toLocaleString()}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeLineItem(item.id)}
                      disabled={lineItems.length === 1}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}

              {errors.lineItems && (
                <p className="text-xs text-red-500">{errors.lineItems}</p>
              )}
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Invoice Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold">₹{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST (18%)</span>
                  <span className="font-semibold">₹{tax.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Amount</span>
                  <span>₹{total.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Additional Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="autoGenerate"
                  checked={formData.autoGenerate}
                  onCheckedChange={(checked) => setFormData({ ...formData, autoGenerate: !!checked })}
                />
                <Label htmlFor="autoGenerate" className="font-medium">
                  Auto-generate invoice number
                </Label>
              </div>

              <div>
                <Label htmlFor="notes">Notes & Terms</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add payment terms, notes, or special instructions..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
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
            {isSubmitting ? 'Creating...' : 'Create Invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}