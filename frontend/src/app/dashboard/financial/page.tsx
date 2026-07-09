import { Metadata } from 'next';
import { FinancialReportsAnalytics } from '@/components/financial/FinancialReportsAnalytics';

export const metadata: Metadata = {
  title: 'Financial Reports & Analytics',
  description: 'Comprehensive financial reporting with payroll analysis, billing reports, site profitability, and forecasting tools',
};

export default function FinancialPage() {
  return (
    <div className="container mx-auto p-6">
      <FinancialReportsAnalytics />
    </div>
  );
}