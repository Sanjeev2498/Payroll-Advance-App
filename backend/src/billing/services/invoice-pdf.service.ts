import { Injectable, BadRequestException } from '@nestjs/common';
import { InvoiceResponse, InvoicePdfResponse } from '../dto';
import { GstCalculationService } from './gst-calculation.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class InvoicePdfService {
  constructor(
    private gstCalculationService: GstCalculationService,
  ) {}

  /**
   * Generate PDF for an invoice
   */
  async generateInvoicePdf(invoice: InvoiceResponse): Promise<InvoicePdfResponse> {
    try {
      // For Phase 1, we'll create a simple HTML-based invoice
      // In production, this could use libraries like Puppeteer, PDFKit, or similar
      const htmlContent = this.generateInvoiceHtml(invoice);
      
      // Create invoices directory if it doesn't exist
      const invoicesDir = path.join(process.cwd(), 'storage', 'invoices');
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }

      const fileName = `invoice-${invoice.invoiceNumber}.html`;
      const filePath = path.join(invoicesDir, fileName);
      
      // Write HTML file (in production, this would be PDF)
      fs.writeFileSync(filePath, htmlContent, 'utf8');
      
      const stats = fs.statSync(filePath);
      
      return {
        invoiceId: invoice.id,
        fileName,
        filePath,
        fileSize: stats.size,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      throw new BadRequestException(`Failed to generate invoice PDF: ${error.message}`);
    }
  }

  /**
   * Generate HTML content for invoice (to be converted to PDF in production)
   */
  private generateInvoiceHtml(invoice: InvoiceResponse): string {
    const gstBreakdown = invoice.gstDetails ? 
      this.gstCalculationService.formatGstBreakdown(invoice.gstDetails) : null;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${invoice.invoiceNumber}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
            line-height: 1.4;
        }
        .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border: 1px solid #ddd;
        }
        .header {
            background: #1f2937;
            color: white;
            padding: 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
        }
        .header p {
            margin: 5px 0 0 0;
            opacity: 0.9;
        }
        .invoice-details {
            display: flex;
            justify-content: space-between;
            padding: 20px;
            background: #f8f9fa;
            border-bottom: 1px solid #ddd;
        }
        .invoice-info, .client-info {
            flex: 1;
        }
        .invoice-info {
            margin-right: 40px;
        }
        .invoice-info h3, .client-info h3 {
            margin: 0 0 10px 0;
            color: #1f2937;
            font-size: 16px;
        }
        .invoice-info p, .client-info p {
            margin: 5px 0;
        }
        .content {
            padding: 20px;
        }
        .section-title {
            font-size: 18px;
            font-weight: bold;
            margin: 20px 0 10px 0;
            color: #1f2937;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 5px;
        }
        .deployment-table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
        }
        .deployment-table th,
        .deployment-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        .deployment-table th {
            background: #f8f9fa;
            font-weight: bold;
        }
        .deployment-table td.number {
            text-align: right;
        }
        .totals-section {
            margin-top: 20px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 5px;
        }
        .totals-table {
            width: 100%;
            max-width: 400px;
            margin-left: auto;
            border-collapse: collapse;
        }
        .totals-table td {
            padding: 5px 10px;
            border-bottom: 1px solid #ddd;
        }
        .totals-table .label {
            text-align: right;
            font-weight: bold;
        }
        .totals-table .amount {
            text-align: right;
            width: 120px;
        }
        .grand-total {
            font-size: 18px;
            font-weight: bold;
            border-top: 2px solid #333;
            background: #1f2937;
            color: white;
        }
        .gst-section {
            margin: 20px 0;
            padding: 15px;
            background: #fef3c7;
            border-radius: 5px;
            border-left: 4px solid #f59e0b;
        }
        .gst-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        .gst-table th,
        .gst-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: right;
        }
        .gst-table th {
            background: #f59e0b;
            color: white;
        }
        .notes {
            margin-top: 20px;
            padding: 15px;
            background: #f0f9ff;
            border-radius: 5px;
            border-left: 4px solid #3b82f6;
        }
        .footer {
            margin-top: 30px;
            padding: 20px;
            background: #1f2937;
            color: white;
            text-align: center;
        }
        .status-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status-draft { background: #fbbf24; color: #92400e; }
        .status-sent { background: #3b82f6; color: white; }
        .status-paid { background: #10b981; color: white; }
        .status-overdue { background: #ef4444; color: white; }
        .status-cancelled { background: #6b7280; color: white; }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="header">
            <h1>TAX INVOICE</h1>
            <p>Security Workforce & Payroll Management System</p>
        </div>

        <div class="invoice-details">
            <div class="invoice-info">
                <h3>Invoice Details</h3>
                <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
                <p><strong>Invoice Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString('en-IN')}</p>
                <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}</p>
                <p><strong>Status:</strong> <span class="status-badge status-${invoice.status.toLowerCase()}">${invoice.status}</span></p>
                <p><strong>Billing Period:</strong> ${new Date(invoice.billingPeriodStart).toLocaleDateString('en-IN')} to ${new Date(invoice.billingPeriodEnd).toLocaleDateString('en-IN')}</p>
            </div>
            
            <div class="client-info">
                <h3>Bill To</h3>
                <p><strong>${invoice.client.name}</strong></p>
                <p>${invoice.client.contactEmail}</p>
                ${invoice.client.contactInfo ? `
                <p>${invoice.client.contactInfo.address || ''}</p>
                <p>${invoice.client.contactInfo.phone || ''}</p>
                ` : ''}
            </div>
        </div>

        <div class="content">
            ${this.generateDeploymentSummaryHtml(invoice)}
            ${this.generateBillingBreakdownHtml(invoice)}
            ${gstBreakdown ? this.generateGstSectionHtml(gstBreakdown) : ''}
            ${this.generateTotalsSectionHtml(invoice)}
            ${invoice.notes ? `
            <div class="notes">
                <h3>Notes:</h3>
                <p>${invoice.notes}</p>
            </div>
            ` : ''}
        </div>

        <div class="footer">
            <p>Thank you for your business!</p>
            <p>This is a system-generated invoice.</p>
        </div>
    </div>
</body>
</html>`;
  }

  private generateDeploymentSummaryHtml(invoice: InvoiceResponse): string {
    if (!invoice.deploymentSummary) return '';

    return `
        <div class="section-title">Deployment Summary</div>
        <p><strong>Total Hours Worked:</strong> ${invoice.deploymentSummary.totalHours} hours</p>
        <p><strong>Sites Covered:</strong> ${invoice.deploymentSummary.totalSites} locations</p>
        <p><strong>Employees Deployed:</strong> ${invoice.deploymentSummary.totalEmployees} personnel</p>
    `;
  }

  private generateBillingBreakdownHtml(invoice: InvoiceResponse): string {
    if (!invoice.deploymentSummary?.siteBreakdown?.length) {
      return `
        <div class="section-title">Service Charges</div>
        <table class="deployment-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Security Services</td>
                    <td class="number">₹${invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
            </tbody>
        </table>
      `;
    }

    let html = `<div class="section-title">Site-wise Deployment Details</div>`;
    
    for (const site of invoice.deploymentSummary.siteBreakdown) {
      html += `
        <h4>Site: ${site.siteName}</h4>
        <table class="deployment-table">
            <thead>
                <tr>
                    <th>Employee</th>
                    <th>Regular Hours</th>
                    <th>Overtime Hours</th>
                    <th>Holiday Hours</th>
                    <th>Total Hours</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
      `;
      
      for (const deployment of site.deployments) {
        html += `
                <tr>
                    <td>${deployment.employeeName} (${deployment.employeeNumber})</td>
                    <td class="number">${deployment.regularHours}</td>
                    <td class="number">${deployment.overtimeHours}</td>
                    <td class="number">${deployment.holidayHours}</td>
                    <td class="number">${deployment.totalHours}</td>
                    <td class="number">₹${deployment.totalAmount.toFixed(2)}</td>
                </tr>
        `;
      }
      
      html += `
                <tr style="background: #f8f9fa; font-weight: bold;">
                    <td>Site Total</td>
                    <td class="number">${site.totalRegularHours}</td>
                    <td class="number">${site.totalOvertimeHours}</td>
                    <td class="number">${site.totalHolidayHours}</td>
                    <td class="number">${site.totalHours}</td>
                    <td class="number">₹${site.totalAmount.toFixed(2)}</td>
                </tr>
            </tbody>
        </table>
      `;
    }
    
    return html;
  }

  private generateGstSectionHtml(gstBreakdown: any): string {
    return `
        <div class="gst-section">
            <h3>GST Breakdown</h3>
            <table class="gst-table">
                <thead>
                    <tr>
                        <th>Tax Component</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Taxable Amount</td>
                        <td>${gstBreakdown.taxableAmount}</td>
                    </tr>
                    ${gstBreakdown.cgst !== '₹0.00' ? `
                    <tr>
                        <td>CGST</td>
                        <td>${gstBreakdown.cgst}</td>
                    </tr>
                    ` : ''}
                    ${gstBreakdown.sgst !== '₹0.00' ? `
                    <tr>
                        <td>SGST</td>
                        <td>${gstBreakdown.sgst}</td>
                    </tr>
                    ` : ''}
                    ${gstBreakdown.igst !== '₹0.00' ? `
                    <tr>
                        <td>IGST</td>
                        <td>${gstBreakdown.igst}</td>
                    </tr>
                    ` : ''}
                    <tr style="background: #f59e0b; color: white; font-weight: bold;">
                        <td>Total GST</td>
                        <td>${gstBreakdown.totalGst}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
  }

  private generateTotalsSectionHtml(invoice: InvoiceResponse): string {
    return `
        <div class="totals-section">
            <table class="totals-table">
                <tr>
                    <td class="label">Subtotal:</td>
                    <td class="amount">₹${invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
                ${invoice.additionalCharges?.length ? `
                <tr>
                    <td class="label">Additional Charges:</td>
                    <td class="amount">₹${invoice.additionalCharges.reduce((sum, charge) => sum + charge.amount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
                ` : ''}
                ${invoice.taxAmount > 0 ? `
                <tr>
                    <td class="label">GST:</td>
                    <td class="amount">₹${invoice.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
                ` : ''}
                <tr class="grand-total">
                    <td class="label">Total Amount:</td>
                    <td class="amount">₹${invoice.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
            </table>
        </div>
    `;
  }

  /**
   * Get invoice file path
   */
  getInvoiceFilePath(invoiceNumber: string): string {
    return path.join(process.cwd(), 'storage', 'invoices', `invoice-${invoiceNumber}.html`);
  }

  /**
   * Check if invoice PDF exists
   */
  invoicePdfExists(invoiceNumber: string): boolean {
    const filePath = this.getInvoiceFilePath(invoiceNumber);
    return fs.existsSync(filePath);
  }

  /**
   * Delete invoice PDF
   */
  deleteInvoicePdf(invoiceNumber: string): void {
    const filePath = this.getInvoiceFilePath(invoiceNumber);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}