import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { getDatabase } from './db/connection';
import { seedDatabase } from './db/seed';
import { SqliteDataStore } from './db/queries';
import { createTerminalRouter } from './routes/terminal';
import { createPracticeRouter } from './routes/practice';
import { createPricingRouter } from './routes/pricing';
import type { SessionState } from './command-engine/types';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// CORS setup for local development with Vite client
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Initialize Database & seed if needed
const db = getDatabase();
const airportCount = (
  db.prepare('SELECT COUNT(*) as count FROM airports').get() as { count: number }
).count;

if (airportCount === 0) {
  console.log('Database empty. Running seed...');
  seedDatabase();
}

const store = new SqliteDataStore(db);
const sessions = new Map<string, SessionState>();

// API Routers
app.use('/api', createTerminalRouter(sessions, store));
app.use('/api/practice', createPracticeRouter(sessions, store));
app.use('/api/pricing', createPricingRouter());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    activeSessions: sessions.size,
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`Sabre GDS Simulator Server running on http://localhost:${PORT}`);
});
