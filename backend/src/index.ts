import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { config } from './config.js';
import { initSocket } from './socket.js';

// Routes
import webhookRouter from './routes/webhook.js';
import menuRouter from './routes/menu.js';
import ordersRouter from './routes/orders.js';
import settingsRouter from './routes/settings.js';
import conversationsRouter from './routes/conversations.js';
import businessRouter from './routes/business.js';
import debugRouter from './routes/debug.js';
import usersRouter from './routes/users.js';
import rolesRouter from './routes/roles.js';
import permissionsRouter from './routes/permissions.js';
import authRouter from './routes/auth.js';

// Platform routes
import platformBusinessesRouter from './routes/platform/businesses.js';
import platformAnalyticsRouter from './routes/platform/analytics.js';
import platformSettingsRouter from './routes/platform/settings.js';
import platformUsersRouter from './routes/platform/users.js';
import platformAuditLogsRouter from './routes/platform/audit-logs.js';
import platformHealthRouter from './routes/platform/health.js';

// Middleware
import { businessContext } from './middleware/business-context.js';
import { platformContext } from './middleware/platform-context.js';
import { apiReference } from '@scalar/express-api-reference';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.set('trust proxy', 1);
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL || 'http://localhost:3000']
    : ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
}));
app.use(helmet());
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  },
}));

// Rate limiting for webhook endpoint
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Privacy Policy page (required by Meta for app publication)
app.get('/privacy', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy — Nadil AI</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 700px; margin: 60px auto; padding: 0 20px; line-height: 1.7; color: #333; }
    h1 { font-size: 1.8rem; margin-bottom: 0.3rem; }
    h2 { font-size: 1.2rem; margin-top: 2rem; }
    p { margin: 0.8rem 0; }
  </style>
</head>
<body>
  <h1>Privacy Policy</h1>
  <p><strong>Last updated:</strong> ${new Date().toISOString().split('T')[0]}</p>
  <p>Nadil AI ("we", "our", or "us") provides a WhatsApp-based AI ordering assistant for restaurants.</p>
  <h2>1. Information We Collect</h2>
  <p>When a customer interacts with our WhatsApp bot, we collect the phone number, message content, and any order details submitted during the conversation. This data is stored to fulfill orders and maintain conversation history.</p>
  <h2>2. How We Use Information</h2>
  <p>We use the collected information solely to process orders, respond to customer inquiries, and improve our service. We do not sell or share customer data with third parties.</p>
  <h2>3. Data Storage and Security</h2>
  <p>Customer data is stored securely and access is restricted to authorized restaurant staff. We implement reasonable security measures to protect against unauthorized access.</p>
  <h2>4. Data Retention</h2>
  <p>Conversation and order data is retained as long as the restaurant account is active. Customers may request deletion of their data by contacting the restaurant directly.</p>
  <h2>5. Contact</h2>
  <p>For privacy-related inquiries, please contact the restaurant through WhatsApp or email.</p>
</body>
</html>`);
});

// Webhook route (no auth required) with rate limiting
app.use('/api/webhook', webhookLimiter, webhookRouter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many auth attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', authLimiter, authRouter);

app.use('/api/menu', businessContext, menuRouter);
app.use('/api/orders', businessContext, ordersRouter);
app.use('/api/settings', businessContext, settingsRouter);
app.use('/api/conversations', businessContext, conversationsRouter);
app.use('/api/business', businessContext, businessRouter);
app.use('/api/debug', debugRouter);

app.use('/api/users', businessContext, usersRouter);
app.use('/api/roles', businessContext, rolesRouter);
app.use('/api/permissions', businessContext, permissionsRouter);

// Platform routes (requires JWT + platform-level access)
app.use('/api/platform/businesses', platformContext, platformBusinessesRouter);
app.use('/api/platform/analytics', platformContext, platformAnalyticsRouter);
app.use('/api/platform/settings', platformContext, platformSettingsRouter);
app.use('/api/platform/users', platformContext, platformUsersRouter);
app.use('/api/platform/audit-logs', platformContext, platformAuditLogsRouter);
app.use('/api/platform/health', platformContext, platformHealthRouter);

// API Documentation
app.get('/api/openapi.yaml', (req, res) => {
  res.sendFile('openapi.yaml', { root: path.resolve(__dirname, '..') });
});
app.use('/api/docs', (apiReference as any)({
  spec: { url: '/api/openapi.yaml' },
  theme: 'purple',
}));

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const server = createServer(app);
initSocket(server as any);

server.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});

export default app;
