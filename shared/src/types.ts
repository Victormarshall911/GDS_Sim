/** Supported GDS dialect names */
export type DialectName = 'sabre' | 'amadeus';

export interface AgentConfig {
  agentId: string;
  pcc: string;
}

export const DEFAULT_AGENT: AgentConfig = {
  agentId: '7890',
  pcc: 'LOS01',
};

/** Request body for POST /api/execute */
export interface ExecuteRequest {
  input: string;
}

/** Response body from POST /api/execute and GET /api/session */
export interface ExecuteResponse {
  output: string;
  signedIn: boolean;
  agentId: string | null;
  dialect: DialectName;
  pcc?: string;
  currentPnr?: string | null;
  hasWorkingPnr?: boolean;
}

