import { getDatabase } from '../src/db/connection';
import { seedDatabase } from '../src/db/seed';
import { SqliteDataStore } from '../src/db/queries';
import type { DataStore } from '../src/command-engine/types';

export function createTestStore(): { store: DataStore; cleanup: () => void } {
  // Use in-memory SQLite database for tests
  const db = getDatabase(':memory:');
  seedDatabase(':memory:');
  const store = new SqliteDataStore(db);

  return {
    store,
    cleanup: () => {
      try {
        db.close();
      } catch {
        // Ignore close error
      }
    },
  };
}
