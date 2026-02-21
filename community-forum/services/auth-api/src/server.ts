import 'dotenv/config';

import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import type { CorsOptionsDelegate, CorsRequest } from 'cors';
import { runMigrations } from './db.js';
import { registerRouter } from './routes/register.js';
import { authenticateRouter } from './routes/authenticate.js';

// ---------------------------------------------------------------------------
// Startup environment variable validation
// ---------------------------------------------------------------------------
const REQUIRED_ENV_VARS = ['DATABASE_URL', 'RELAY_URL', 'RP_ID', 'RP_NAME', 'RP_ORIGIN'];
const missingEnvVars = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);
if (missingEnvVars.length > 0) {
  console.error(`[auth-api] Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

const app = express();

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
const allowedOrigins: string[] = [
  'https://dreamlab-ai.com',
  'https://www.dreamlab-ai.com',
];

if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:5173');
}

const corsDelegate: CorsOptionsDelegate<CorsRequest> = (req, callback) => {
  const origin = (req as Request).headers.origin;
  if (!origin) {
    callback(null, { origin: true, methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'], credentials: true });
    return;
  }
  if (allowedOrigins.includes(origin)) {
    callback(null, { origin: true, methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'], credentials: true });
    return;
  }
  callback(new Error(`CORS: origin ${origin} not allowed`), { origin: false });
};

app.use(cors(corsDelegate));

// ---------------------------------------------------------------------------
// Raw body capture (must come BEFORE express.json)
// ---------------------------------------------------------------------------
app.use(express.raw({ type: '*/*', limit: '1mb' }));
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (Buffer.isBuffer(req.body)) {
    (req as any).rawBody = req.body;
    try {
      req.body = JSON.parse(req.body.toString());
    } catch {
      req.body = {};
    }
  }
  next();
});

// ---------------------------------------------------------------------------
// Health check (unauthenticated)
// ---------------------------------------------------------------------------
app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true, service: 'auth-api' });
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/auth/register', registerRouter);
app.use('/auth/login', authenticateRouter);

// ---------------------------------------------------------------------------
// 404
// ---------------------------------------------------------------------------
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// ---------------------------------------------------------------------------
// Error handler
// ---------------------------------------------------------------------------
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof Error && err.message.startsWith('CORS:')) {
    res.status(403).json({ error: err.message });
    return;
  }
  console.error('[server] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------
const PORT = parseInt(process.env.PORT ?? '8080', 10);

async function start(): Promise<void> {
  try {
    await runMigrations();
  } catch (err) {
    console.error('[server] Database migration failed:', err);
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`[auth-api] Listening on port ${PORT}`);
    console.log(`[auth-api] RP_ID=${process.env.RP_ID}`);
    console.log(`[auth-api] RP_ORIGIN=${process.env.RP_ORIGIN}`);
  });

  const shutdown = (signal: string) => {
    console.log(`[auth-api] Received ${signal}, shutting down gracefully`);
    server.close(() => {
      console.log('[auth-api] HTTP server closed');
      process.exit(0);
    });
    // Force exit after 10 s if server hasn't drained
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start();
