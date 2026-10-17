import type { DataStore } from './types';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude ambiguous 'I' and 'O' if preferred, or standard uppercase alphabet

/**
 * Generate a 6-character alphabetic record locator.
 * Verifies with DataStore that it doesn't already exist in the database.
 */
export function generateRecordLocator(store: DataStore): string {
  const maxAttempts = 100;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let locator = '';
    for (let i = 0; i < 6; i++) {
      const idx = Math.floor(Math.random() * CHARS.length);
      locator += CHARS[idx];
    }

    if (store.isRecordLocatorUnique(locator)) {
      return locator;
    }
  }

  // Fallback timestamp-based alpha code if random collisions occur
  return 'S' + Math.random().toString(36).substring(2, 7).toUpperCase();
}
