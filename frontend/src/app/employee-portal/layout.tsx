import { EmployeePortalLayout } from '@/components/employee-portal/EmployeePortalLayout';

export default function EmployeePortalLayoutPage({
  children,
}: {
  children: React.ReactNode;
}) {
  return <EmployeePortalLayout>{children}</EmployeePortalLayout>;
}