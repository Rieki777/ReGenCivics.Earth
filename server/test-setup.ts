/**
 * Per-file test cleanup (unused: no vitest config loads this file; the real
 * global setup and teardown is server/test-global-teardown.ts).
 * Would run cleanupTestData after a file's tests, against the LOCAL test
 * database only: cleanupTestData refuses any host that is not local or listed
 * in TEST_DB_HOSTS.
 */
import { afterAll } from 'vitest';
import { cleanupTestData } from './test-cleanup';

afterAll(async () => {
  await cleanupTestData();
});
