export type PersistenceMode = 'mock' | 'db';

export function resolvePersistenceMode(): PersistenceMode {
  return process.env.PERSISTENCE_MODE === 'db' ? 'db' : 'mock';
}

export function useDbPersistence(): boolean {
  return resolvePersistenceMode() === 'db';
}

