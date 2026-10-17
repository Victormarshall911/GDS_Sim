export interface ExecuteResponse {
  output: string;
  signedIn: boolean;
  agentId: string | null;
  dialect: 'sabre' | 'amadeus';
  pcc?: string;
  currentPnr: string | null;
  hasWorkingPnr: boolean;
  pnrSummary?: {
    paxCount: number;
    segCount: number;
    hasPhone: boolean;
    hasTicketing: boolean;
    hasRF: boolean;
  } | null;
}

export interface SessionResponse {
  output: string;
  signedIn: boolean;
  agentId: string | null;
  dialect: 'sabre' | 'amadeus';
  pcc?: string;
  currentPnr: string | null;
  hasWorkingPnr: boolean;
}

export interface ScenarioDefinition {
  id: string;
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  expectedRoute: {
    origin: string;
    destination: string;
    airlineCode?: string;
    classCode?: string;
  };
  objectives: {
    id: string;
    description: string;
    hint: string;
  }[];
}

export interface CheckScenarioResponse {
  scenarioId: string;
  scenarioTitle: string;
  score: number;
  passed: boolean;
  feedback: string[];
  recordLocator: string | null;
}

const API_BASE = '/api';

export async function executeCommand(input: string): Promise<ExecuteResponse> {
  const res = await fetch(`${API_BASE}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input }),
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Execution error: ${res.statusText}`);
  }
  return res.json();
}

export async function getSession(): Promise<SessionResponse> {
  const res = await fetch(`${API_BASE}/session`, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch session: ${res.statusText}`);
  }
  return res.json();
}

export async function resetSession(): Promise<SessionResponse> {
  const res = await fetch(`${API_BASE}/session/reset`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Failed to reset session: ${res.statusText}`);
  }
  return res.json();
}

export async function getScenarios(): Promise<ScenarioDefinition[]> {
  const res = await fetch(`${API_BASE}/practice/scenarios`, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error('Failed to fetch scenarios');
  }
  return res.json();
}

export async function checkScenario(scenarioId: string): Promise<CheckScenarioResponse> {
  const res = await fetch(`${API_BASE}/practice/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenarioId }),
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error('Failed to evaluate scenario');
  }
  return res.json();
}

export async function getPricingConfig(): Promise<any> {
  const res = await fetch(`${API_BASE}/pricing/config`, {
    credentials: 'include',
  });
  return res.json();
}

export async function savePricingConfig(config: any): Promise<any> {
  const res = await fetch(`${API_BASE}/pricing/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
    credentials: 'include',
  });
  return res.json();
}
