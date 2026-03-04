/**
 * Global Test Setup
 * Runs cleanup after all tests to remove test data from the production database.
 */
import { afterAll } from 'vitest';
import { cleanupTestData } from './test-cleanup';

afterAll(async () => {
  await cleanupTestData();
});
