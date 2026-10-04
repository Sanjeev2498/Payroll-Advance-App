# Production Deployment Guide

## Environment Configuration

### Required Environment Variables

```bash
# API Configuration
NODE_ENV=production
PORT=3005
API_BASE_URL=https://api.yourdomain.com

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/payroll_prod

# JWT Configuration
JWT_SECRET=your-super-secure-secret-key
JWT_EXPIRES_IN=3600
REFRESH_TOKEN_EXPIRES_IN=604800

# Redis (for caching and sessions)
REDIS_URL=redis://localhost:6379

# File Storage
AWS_S3_BUCKET=payroll-documents
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Email Configuration
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=smtp-password

# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
```

### SSL/TLS Configuration

Ensure HTTPS is properly configured:

```nginx
server {
    listen 443 ssl;
    server_name api.yourdomain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    location / {
        proxy_pass http://localhost:3005;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Security Considerations

### 1. Rate Limiting
Configure appropriate rate limits based on usage patterns:

```javascript
// Example rate limiting configuration
const rateLimit = {
  auth: { windowMs: 60000, max: 10 },      // 10 login attempts per minute
  api: { windowMs: 60000, max: 100 },      // 100 API calls per minute
  upload: { windowMs: 60000, max: 5 }      // 5 file uploads per minute
};
```

### 2. CORS Configuration
Configure CORS for your allowed origins:

```javascript
const corsOptions = {
  origin: [
    'https://app.yourdomain.com',
    'https://admin.yourdomain.com'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};
```

### 3. Security Headers
Implement security headers:

```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

## Monitoring and Logging

### 1. Application Monitoring

```javascript
// Sentry integration for error tracking
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version
  });
});
```

### 2. Structured Logging

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'payroll-api' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### 3. Performance Monitoring

```javascript
// Response time tracking
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  });
  
  next();
});
```

## Database Optimization

### 1. Connection Pooling

```javascript
const pool = {
  min: 2,
  max: 20,
  createTimeoutMillis: 30000,
  acquireTimeoutMillis: 60000,
  idleTimeoutMillis: 600000,
  reapIntervalMillis: 1000,
  createRetryIntervalMillis: 100
};
```

### 2. Query Optimization
- Add appropriate database indexes
- Use database query analysis tools
- Implement query result caching

### 3. Migration Strategy

```bash
# Production migration process
npm run db:backup
npm run db:migrate
npm run db:seed:production
```

## Deployment Strategies

### 1. Blue-Green Deployment

```bash
# Deploy to green environment
kubectl apply -f k8s/green-deployment.yaml

# Run smoke tests
npm run test:smoke -- --target=green

# Switch traffic to green
kubectl patch service payroll-api -p '{"spec":{"selector":{"version":"green"}}}'

# Monitor for issues
kubectl logs -f deployment/payroll-api-green

# If successful, terminate blue
kubectl delete deployment payroll-api-blue
```

### 2. Docker Configuration

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

WORKDIR /app
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --chown=nextjs:nodejs . .

USER nextjs

EXPOSE 3005

CMD ["npm", "start"]
```

### 3. Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payroll-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payroll-api
  template:
    metadata:
      labels:
        app: payroll-api
    spec:
      containers:
      - name: api
        image: payroll-api:latest
        ports:
        - containerPort: 3005
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3005
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3005
          initialDelaySeconds: 5
          periodSeconds: 5
```

## Backup and Disaster Recovery

### 1. Database Backups

```bash
# Automated daily backups
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > /backups/payroll_$DATE.sql
aws s3 cp /backups/payroll_$DATE.sql s3://payroll-backups/
```

### 2. Application State Backup

```bash
# Backup uploaded documents
aws s3 sync s3://payroll-documents s3://payroll-documents-backup/

# Backup configuration
kubectl get configmap payroll-config -o yaml > config-backup.yaml
```

## Maintenance Procedures

### 1. Graceful Shutdown

```javascript
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  // Stop accepting new requests
  server.close(() => {
    console.log('HTTP server closed');
    
    // Close database connections
    db.close();
    
    // Close Redis connections
    redis.disconnect();
    
    process.exit(0);
  });
});
```

### 2. Health Checks

```javascript
app.get('/health/detailed', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      external_apis: await checkExternalAPIs()
    }
  };
  
  const isHealthy = Object.values(health.checks).every(check => check.status === 'ok');
  
  res.status(isHealthy ? 200 : 503).json(health);
});
```

## Performance Optimization

### 1. Caching Strategy

```javascript
// Redis caching for frequently accessed data
const cache = {
  employees: 300,      // 5 minutes
  clients: 600,        // 10 minutes
  sites: 1800,         // 30 minutes
  reports: 3600        // 1 hour
};
```

### 2. Database Query Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_employees_tenant_id ON employees(tenant_id);
CREATE INDEX idx_attendance_date_employee ON attendance(date, employee_id);
CREATE INDEX idx_payroll_pay_period ON payroll_runs(pay_period_start, pay_period_end);
```

## Troubleshooting

### Common Issues and Solutions

1. **High Memory Usage:**
   - Check for memory leaks in application code
   - Review database connection pooling
   - Analyze garbage collection patterns

2. **Slow Database Queries:**
   - Use EXPLAIN ANALYZE to identify slow queries
   - Add missing indexes
   - Consider query optimization

3. **Authentication Issues:**
   - Verify JWT secret configuration
   - Check token expiration settings
   - Review CORS configuration

4. **File Upload Problems:**
   - Check S3 permissions and configuration
   - Verify file size limits
   - Review upload timeout settings
