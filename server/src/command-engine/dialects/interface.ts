import type { SessionState, CommandResult, DataStore } from '../types';

/**
 * Interface for GDS dialect implementations.
 * Each dialect (Sabre, Amadeus, etc.) implements this interface.
 */
export interface Dialect {
  /** Dialect identifier */
  readonly name: string;

  /**
   * Execute a command string against the current session state.
   * @param input  – raw command string (already trimmed & uppercased)
   * @param state  – current session state
   * @param store  – data-store for DB operations
   * @returns command result with output text and updated state
   */
  execute(input: string, state: SessionState, store: DataStore): CommandResult;
}
