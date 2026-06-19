# Security Workforce & Payroll Management - Frontend

This is the frontend application for the Security Workforce & Payroll Management System, built with Next.js 14+ and the App Router.

## Tech Stack

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod validation
- **UI Components**: Custom component library built on Tailwind CSS

## Features

- 🔐 **Authentication & Authorization**: JWT-based auth with role-based access control
- 🏢 **Multi-tenant Architecture**: Complete tenant isolation and context management  
- 📊 **Real-time Dashboard**: Live metrics and operational monitoring
- 👥 **Employee Management**: Comprehensive workforce lifecycle management
- 📍 **Site Operations**: Client site management and assignment tracking
- ⏰ **Attendance Tracking**: Real-time clock-in/out with GPS verification
- 💰 **Payroll Processing**: Automated salary calculations and reporting
- 📱 **Responsive Design**: Mobile-first responsive interface

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend API server running (see backend README)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
# Update .env.local with your configuration
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Project Structure

```
src/
├── app/                    # App Router pages and layouts
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard and main app pages
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # Reusable UI components
│   ├── ui/               # Basic UI primitives
│   └── layout/           # Layout components
├── stores/               # Zustand state stores
│   ├── auth-store.ts     # Authentication state
│   └── app-store.ts      # Application UI state
├── lib/                  # Utility functions and API client
│   ├── api.ts           # API client and query keys
│   └── utils.ts         # Helper utilities
└── types/               # TypeScript type definitions
    └── index.ts         # Core business entity types
```

## State Management

### Zustand Stores

- **Auth Store** (`useAuthStore`): Manages user authentication state, tokens, and user profile
- **App Store** (`useAppStore`): Manages UI state like sidebar collapse, theme, and dashboard preferences

### TanStack Query

Used for server state management with automatic caching, background refetching, and optimistic updates. Query keys are organized in a factory pattern for consistency.

## Authentication Flow

1. User logs in via `/auth/login`
2. JWT token and user data stored in Zustand with localStorage persistence
3. API requests automatically include Authorization header
4. Protected routes check authentication state and redirect if needed
5. Tenant context automatically included in all API calls

## API Integration

The frontend communicates with the NestJS backend via RESTful APIs. The API client (`lib/api.ts`) provides:

- Automatic JWT token inclusion
- Standardized error handling
- Type-safe request/response handling
- Query key factory for TanStack Query

## Component Library

Custom UI components built on Tailwind CSS provide:

- Consistent design system with design tokens
- Accessible components following ARIA guidelines
- Type-safe props with TypeScript
- Responsive design patterns

## Development Guidelines

### Code Style
- Use TypeScript strict mode
- Follow ESLint configuration
- Use functional components with hooks
- Implement proper error boundaries

### State Management
- Use Zustand for client state
- Use TanStack Query for server state
- Avoid prop drilling with proper state architecture
- Implement optimistic updates where appropriate

### Performance
- Implement proper code splitting
- Use Next.js Image optimization
- Lazy load heavy components
- Optimize bundle size with proper imports

## Deployment

### Production Build
```bash
npm run build
npm run start
```

### Environment Variables
Ensure all required environment variables are set in production:
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NODE_ENV=production`

### Docker Support
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Contributing

1. Follow the established code style and patterns
2. Add TypeScript types for new features
3. Include unit tests for complex logic
4. Update documentation for new features
5. Test across different screen sizes and devices

## License

This project is proprietary software. All rights reserved.