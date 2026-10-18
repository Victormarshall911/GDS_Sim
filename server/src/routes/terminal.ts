import { Router, type Request, type Response } from 'express';
import { executeCommand, createInitialSessionState } from '../command-engine/engine';
import { DEFAULT_AGENT, AMADEUS_CONFIG } from '../command-engine/command-config';
import type { SessionState, DataStore } from '../command-engine/types';

export function createTerminalRouter(
  sessions: Map<string, SessionState>,
  store: DataStore
): Router {
  const router = Router();

  function getOrCreateSession(req: Request, res: Response): { sessionId: string; state: SessionState } {
    let sessionId = req.cookies?.['sabre_session_id'] as string | undefined;

    if (sessionId) {
      if (sessions.has(sessionId)) {
        return { sessionId, state: sessions.get(sessionId)! };
      }
      if (store.getSession) {
        const persisted = store.getSession(sessionId);
        if (persisted) {
          sessions.set(sessionId, persisted);
          return { sessionId, state: persisted };
        }
      }
    }

    sessionId = sessionId || crypto.randomUUID();
    const newState = createInitialSessionState('sabre', true);
    sessions.set(sessionId, newState);
    if (store.saveSession) {
      store.saveSession(sessionId, newState);
    }
    res.cookie('sabre_session_id', sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    return { sessionId, state: newState };
  }

  // POST /api/execute
  router.post('/execute', (req: Request, res: Response) => {
    try {
      const { sessionId, state } = getOrCreateSession(req, res);
      const input = (req.body?.input as string | undefined) ?? '';

      let result = executeCommand(state, input, store, sessionId);

      // If dialect switched, adjust agent ID if still on default agent
      if (result.newState.dialect === 'amadeus' && state.dialect === 'sabre') {
        if (result.newState.agentId === DEFAULT_AGENT.agentId) {
          result = {
            ...result,
            newState: {
              ...result.newState,
              agentId: AMADEUS_CONFIG.defaultAgent.agentId,
            },
          };
        }
      } else if (result.newState.dialect === 'sabre' && state.dialect === 'amadeus') {
        if (result.newState.agentId === AMADEUS_CONFIG.defaultAgent.agentId) {
          result = {
            ...result,
            newState: {
              ...result.newState,
              agentId: DEFAULT_AGENT.agentId,
            },
          };
        }
      }

      sessions.set(sessionId, result.newState);
      if (store.saveSession) {
        store.saveSession(sessionId, result.newState);
      }

      const currentPcc =
        result.newState.dialect === 'amadeus'
          ? AMADEUS_CONFIG.defaultAgent.officeId
          : DEFAULT_AGENT.pcc;

      res.json({
        output: result.output,
        signedIn: result.newState.signedIn,
        agentId: result.newState.agentId,
        dialect: result.newState.dialect,
        pcc: currentPcc,
        currentPnr: result.newState.currentPnr,
        hasWorkingPnr: !!result.newState.workingPnr,
        pnrSummary: result.newState.workingPnr
          ? {
              paxCount: result.newState.workingPnr.passengers.length,
              segCount: result.newState.workingPnr.segments.length,
              hasPhone: !!result.newState.workingPnr.phone,
              hasTicketing: !!result.newState.workingPnr.ticketing,
              hasRF: !!result.newState.workingPnr.receivedFrom,
            }
          : null,
      });
    } catch (err: any) {
      res.json({
        output: `SYSTEM ERROR: ${err?.message || 'UNABLE TO PROCESS COMMAND'}`,
        signedIn: true,
        agentId: null,
        dialect: 'sabre',
        pcc: DEFAULT_AGENT.pcc,
        currentPnr: null,
        hasWorkingPnr: false,
        pnrSummary: null,
      });
    }
  });

  // GET /api/session
  router.get('/session', (req: Request, res: Response) => {
    const { state } = getOrCreateSession(req, res);
    const currentPcc =
      state.dialect === 'amadeus'
        ? AMADEUS_CONFIG.defaultAgent.officeId
        : DEFAULT_AGENT.pcc;

    res.json({
      output: '',
      signedIn: state.signedIn,
      agentId: state.agentId,
      dialect: state.dialect,
      pcc: currentPcc,
      currentPnr: state.currentPnr,
      hasWorkingPnr: !!state.workingPnr,
    });
  });

  // POST /api/session/reset
  router.post('/session/reset', (req: Request, res: Response) => {
    const { sessionId, state } = getOrCreateSession(req, res);
    const cleanState = createInitialSessionState(state.dialect, true);
    sessions.set(sessionId, cleanState);
    if (store.saveSession) {
      store.saveSession(sessionId, cleanState);
    }
    const currentPcc =
      cleanState.dialect === 'amadeus'
        ? AMADEUS_CONFIG.defaultAgent.officeId
        : DEFAULT_AGENT.pcc;

    res.json({
      output: 'SESSION RESET - WORK AREA CLEARED',
      signedIn: true,
      agentId: cleanState.agentId,
      dialect: cleanState.dialect,
      pcc: currentPcc,
      currentPnr: null,
      hasWorkingPnr: false,
    });
  });

  return router;
}
