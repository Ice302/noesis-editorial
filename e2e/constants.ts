/** Throwaway database for the e2e run (recreated by global-setup.ts). */
export const E2E_DB_PATH = 'e2e/.data/e2e.db';

/** Editor accounts seeded before the suite runs. */
export const EDITORS = [
  { username: 'e2e-a', displayName: 'Editor A', password: 'e2e-password-a' },
  { username: 'e2e-b', displayName: 'Editor B', password: 'e2e-password-b' },
] as const;
