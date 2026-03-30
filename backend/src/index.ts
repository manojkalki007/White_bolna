import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import campaignRoutes from './routes/campaigns';
import webhookRoutes from './routes/webhooks';
import callLogRoutes from './routes/callLogs';
import callRoutes from './routes/calls';
import agentRoutes from './routes/agents';
import analyticsRoutes from './routes/analytics';
import numbersRoutes from './routes/numbers';
import audiencesRoutes from './routes/audiences';
import authRoutes from './routes/auth';
import kbRoutes from './routes/kb';
import adminRoutes from './routes/admin';
import settingsRoutes from './routes/settings';
import { errorHandler } from './middleware/errorHandler';
import { startCallPoller } from './lib/callPoller';

const app = express();

// ─── Security & Logging ───────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  })
);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── Body parsing ─────────────────────────────────────────────────────────────
// Capture raw body for webhook HMAC verification BEFORE json middleware
app.use(
  express.json({
    verify: (req: Request & { rawBody?: string }, _res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth',      authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/webhooks',  webhookRoutes);
app.use('/api/call-logs', callLogRoutes);
app.use('/api/calls',     callRoutes);
app.use('/api/agents',    agentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/numbers',   numbersRoutes);
app.use('/api/audiences', audiencesRoutes);
app.use('/api/kb',        kbRoutes);
app.use('/api/admin',     adminRoutes);
app.use('/api/settings',  settingsRoutes);

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((_req: Request, _res: Response, next: NextFunction) => {
  const err: Error & { statusCode?: number } = new Error('Route not found');
  err.statusCode = 404;
  next(err);
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? '4000', 10);
app.listen(PORT, () => {
  console.log(`🚀 Bolna Voice AI API running on http://localhost:${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV ?? 'development'}`);
  console.log(`   Bolna Base  : ${process.env.BOLNA_BASE_URL ?? 'https://api.bolna.dev'}`);

  // Start background call status poller (auto-skips in production if webhook secret is set)
  startCallPoller();
});

export default app;
