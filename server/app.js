const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const { ALLOWED_ORIGINS, TRUST_PROXY, NODE_ENV } = require('./config/env');
const { noSqlSanitizer } = require('./middleware/sanitizer');
const csrfProtection = require('./middleware/csrf');
const { apiLimiter } = require('./middleware/rateLimiters');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const apiRoutes = require('./routes');
const healthRoutes = require('./routes/health.routes');
const { UPLOADS_DIR } = require('./services/image.service');

const app = express();

// Trust proxy for reverse proxies/load balancers when enabled
if (TRUST_PROXY) {
  app.set('trust proxy', 1);
}

// 1. Helmet security headers with strict Content-Security-Policy (no inline scripts)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"], // Disallows inline scripts; all JS in external files
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com', 'blob:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

// 2. CORS configuration with allowed origins
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, same-origin, curl, server-to-server)
      if (!origin) return callback(null, true);
      const isAllowed = ALLOWED_ORIGINS.some((allowed) => {
        try {
          return new URL(allowed).origin === new URL(origin).origin;
        } catch {
          return false;
        }
      });
      if (isAllowed) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked request from origin: ${origin}`));
    },
    credentials: true
  })
);

// 3. Request logging with sensitive data excluded
if (NODE_ENV !== 'test') {
  app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));
}

// 4. Body parsers with 10 KB payload limit
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 5. Cookie parser
app.use(cookieParser());

// 6. NoSQL query injection sanitizer (strips keys starting with $ or containing .)
app.use(noSqlSanitizer);

// 7. Root health check endpoint (bypasses CSRF and rate limiter)
app.use('/health', healthRoutes);

// 8. Static file serving
// Serve client folder for same-origin frontend
app.use(express.static(path.join(__dirname, '../client')));

// Serve uploads in development and test mode
app.use('/uploads', express.static(UPLOADS_DIR));

// 9. API v1 Router with CSRF check and rate limiter
app.use('/api/v1', apiLimiter, csrfProtection, apiRoutes);

// 10. SPA / HTML page routing fallback for client/pages if accessed without .html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/pages/home.html'));
});

// 11. Catch-all 404 for undefined API endpoints
app.use('/api/*', notFoundHandler);

// Fallback to 404 HTML page for client requests
app.use((req, res, next) => {
  if (req.accepts('html')) {
    return res.status(404).sendFile(path.join(__dirname, '../client/pages/404.html'));
  }
  next();
});

// 12. Global error handling middleware
app.use(errorHandler);

module.exports = app;
