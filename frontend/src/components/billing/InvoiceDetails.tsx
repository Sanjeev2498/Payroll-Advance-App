'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, Send, Edit, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useBilling } from '@/hooks/use-billing';
import { formatDate } from '@/lib/utils';

interface InvoiceDetailsProps {
  invoiceId: string;
}

export function InvoiceDetails({ invoiceId }: InvoiceDetailsProps) {
  const { getInvoiceDetails, generateInvoice } = useBilling();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoiceDetails();
  }, [invoiceId]);

  const fetchInvoiceDetails = async () => {
    try {
      setLoading(true);
      const details = await getInvoiceDetails(invoiceId);
      setInvoice(details);
    } catch (error) {
      console.error('Failed to load invoice details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-4 pt-4 border-t">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="mt-4 pt-4 border-t">
        <p className="text-red-600">Failed to load invoice details</p>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t space-y-4">
      {/* Invoice Header */}
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-semibold text-lg">{invoice.invoiceNumber}</h4>
          <p className="text-gray-600">{invoice.clientName}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => generateInvoice(invoiceId, { format: 'pdf' })}>
            <Download className="h-4 w-4 mr-1" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => generateInvoice(invoiceId, { format: 'excel' })}>
            <Download className="h-4 w-4 mr-1" />
            Excel
          </Button>
        </div>
      </div>

      {/* Invoice Details Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h5 className="font-semibold mb-3">Invoice Information</h5>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Issue Date:</span>
              <span>{formatDate(invoice.issueDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Due Date:</span>
              <span>{formatDate(invoice.dueDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Billing Period:</span>
              <span>{formatDate(invoice.billingPeriodStart)} - {formatDate(invoice.billingPeriodEnd)}</span>
            </div>
            {invoice.paidDate && (
              <div className="flex justify-between">
                <span className="text-gray-600">Paid Date:</span>
                <span>{formatDate(invoice.paidDate)}</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <h5 className="font-semibold mb-3">Amount Breakdown</h5>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal:</span>
              <span>₹{invoice.subtotal?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tax (18% GST):</span>
              <span>₹{invoice.tax?.toLocaleString()}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total Amount:</span>
              <span>₹{invoice.total?.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div>
        <h5 className="font-semibold mb-3">Line Items</h5>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Description</th>
                <th className="px-4 py-2 text-right">Qty</th>
                <th className="px-4 py-2 text-right">Rate</th>
                <th className="px-4 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems?.map((item: any, index: number) => (
                <tr key={index} className="border-t">
                  <td className="px-4 py-2">{item.description}</td>
                  <td className="px-4 py-2 text-right">{item.quantity}</td>
                  <td className="px-4 py-2 text-right">₹{item.rate.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right font-semibold">₹{item.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div>
          <h5 className="font-semibold mb-2">Notes & Terms</h5>
          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            {invoice.notes}
          </p>
        </div>
      )}
    </div>
  );
}