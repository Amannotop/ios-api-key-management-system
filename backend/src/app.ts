import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { cookieParser } from './middleware/cookieParser';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'http';
import { config } from './config';
import checkRoutes from './routes/check';
import adminRoutes from './routes/admin';
import webhookRoutes from './routes/webhooks';
import metricsRoutes from './routes/metrics';
import v1Routes from './routes/v1';
import v2Routes from './routes/v2';
import { setupWebSocket } from './routes/websocket';
import { getSwaggerDoc } from './controllers/swagger';
import { PrismaClient } from '@prisma/client';

dotenv.config();

// Singleton Prisma client to prevent memory leaks
const prisma = new PrismaClient();

const app = express();
const server = http.createServer(app) as Server;

setupWebSocket(server);

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

app.use('/api/v1', v1Routes);
app.use('/api/v2', v2Routes);
app.use('/api', checkRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/metrics', metricsRoutes);

app.get('/api/docs', getSwaggerDoc);

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    apiVersions: ['v1', 'v2']
  });
});

app.get('/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready' });
  } catch {
    res.status(503).json({ status: 'not ready' });
  }
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

async function seedAdmin() {
  const bcrypt = require('bcryptjs');

  try {
    const existing = await prisma.admin.findUnique({ where: { username: config.adminUsername } });
    if (!existing) {
      const hashedPassword = bcrypt.hashSync(config.adminPassword, 10);
      await prisma.admin.create({
        data: { username: config.adminUsername, password: hashedPassword },
      });
      console.log('Default admin created');
    }
  } catch (error) {
    console.error('Admin seed error:', error);
  }
}

const PORT = config.port;

server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  // Only seed admin on first start, not every time
  const adminExists = await prisma.admin.findUnique({ where: { username: config.adminUsername } });
  if (!adminExists) {
    await seedAdmin();
  }
});

// Graceful shutdown handling
const shutdown = async (signal: string) => {
  console.log(`\n${signal} received, shutting down gracefully...`);
  try {
    await prisma.$disconnect();
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  } catch (error) {
    console.error('Shutdown error:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app, server, prisma };
