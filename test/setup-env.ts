// Runs before any test file's module graph loads (see jest-e2e.json's
// `setupFiles`) — loads .env.test with `override: true` so it wins over
// whatever's already in the shell's env, then every module that reads
// `process.env` later (data-source.ts, config/configuration.ts) picks up
// the test database / test storage bucket instead of dev's.
import { config } from 'dotenv';
import * as path from 'path';

config({ path: path.resolve(__dirname, '../.env.test'), override: true });
