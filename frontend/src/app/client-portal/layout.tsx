import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Client Portal | Security Workforce Management',
  description: 'Client self-service portal for monitoring security services, attendance tracking, billing management, and comprehensive reporting.',
  keywords: 'client portal, security services, guard monitoring, attendance tracking, billing, reports',
};

export default function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="py-8">
        {children}
      </main>
    </div>
  );
}