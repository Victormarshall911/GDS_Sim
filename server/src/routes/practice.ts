import { Router, type Request, type Response } from 'express';
import { SCENARIOS } from '../practice/scenarios';
import { checkScenario } from '../practice/checker';
import type { SessionState, DataStore } from '../command-engine/types';

export function createPracticeRouter(
  sessions: Map<string, SessionState>,
  store: DataStore
): Router {
  const router = Router();

  // GET /api/scenarios
  router.get('/scenarios', (_req: Request, res: Response) => {
    res.json(SCENARIOS);
  });

  // POST /api/practice/check
  router.post('/check', (req: Request, res: Response) => {
    const sessionId = (req.cookies?.['sabre_session_id'] as string | undefined) ?? 'default-session';
    const state = sessions.get(sessionId);

    if (!state) {
      res.status(400).json({ error: 'No active terminal session found' });
      return;
    }

    const scenarioId = req.body?.scenarioId as string | undefined;
    if (!scenarioId) {
      res.status(400).json({ error: 'scenarioId is required' });
      return;
    }

    const checkResult = checkScenario(scenarioId, state, store, sessionId);
    res.json(checkResult);
  });

  return router;
}
