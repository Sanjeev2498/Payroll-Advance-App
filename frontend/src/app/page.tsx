import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <div className="text-center lg:text-left">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Security Workforce & 
            <span className="text-blue-600"> Payroll Management</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Comprehensive SaaS platform for security guard agencies, facility management companies, 
            and staffing agencies. Streamline workforce operations from client acquisition through payroll processing.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6 lg:justify-start">
            <Link
              href="/auth/login"
              className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Get Started
            </Link>
            <Link 
              href="/about" 
              className="text-sm font-semibold leading-6 text-gray-900"
            >
              Learn more <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-16 flow-root max-w-5xl w-full">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Operations Visibility</h3>
            <p className="text-gray-600">
              Real-time dashboards showing site status, workforce deployment, and performance metrics
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Workforce Monitoring</h3>
            <p className="text-gray-600">
              Live attendance tracking, staffing gap identification, and site health monitoring
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Payroll Insights</h3>
            <p className="text-gray-600">
              Automated salary processing with detailed analytics and compliance reporting
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}