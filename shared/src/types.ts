/** Supported GDS dialect names */
export type DialectName = 'sabre' | 'amadeus';

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
}
