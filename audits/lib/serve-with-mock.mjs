// Serves the app's production build with its Anthropic SDK pointed at lib/mock-anthropic.mjs, so the Playwright
// suite exercises the real route without a real key. The mock listens on a port the OS picks, so it cannot
// collide with anything else on the machine; only the app's own port is fixed.
//
//   node lib/serve-with-mock.mjs --port 3208
//
// Playwright starts this as its webServer and stops the whole process group at the end.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { startMockAnthropic } from './mock-anthropic.mjs';

const { values } = parseArgs({ options: { port: { type: 'string', default: '3208' } } });
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const { port: mockPort } = await startMockAnthropic(0);
console.log(`mock Anthropic API on 127.0.0.1:${mockPort}`);

const app = spawn('npx', ['next', 'start', '-p', values.port], {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    // Set explicitly so .env.local can never supply a real key to the test server.
    ANTHROPIC_API_KEY: 'test-key-not-real',
    ANTHROPIC_BASE_URL: `http://127.0.0.1:${mockPort}`,
    DECODE_MODEL: 'mock-model',
  },
});

const stop = () => { app.kill('SIGTERM'); process.exit(0); };
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
app.on('exit', code => process.exit(code ?? 0));
