require('dotenv').config();

const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');

const app = require('../src/app');
const prisma = require('../src/lib/prisma');
const { createGracefulShutdown } = require('../src/utils/gracefulShutdown');
const { sanitizeLogMessage } = require('../src/utils/sanitizeLogMessage');

let server;
let baseUrl;

async function request(path) {
  const response = await fetch(`${baseUrl}${path}`);
  return { status: response.status, body: await response.json() };
}

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();
});

test('request logging middleware permits normal requests', async () => {
  const response = await request('/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
});

test('unknown routes return a JSON 404 response', async () => {
  const response = await request('/this-route-does-not-exist');
  assert.equal(response.status, 404);
  assert.deepEqual(response.body, { message: 'Route not found' });
});

test('global error handler sanitizes unexpected errors', async () => {
  const response = await request('/__test/error');
  assert.equal(response.status, 500);
  assert.deepEqual(response.body, { message: 'Internal server error' });
  assert.ok(!JSON.stringify(response.body).includes('P2028'));
  assert.ok(!JSON.stringify(response.body).toLowerCase().includes('stack'));
});

test('existing authentication 4xx responses are preserved', async () => {
  const response = await request('/cart');
  assert.equal(response.status, 401);
  assert.equal(response.body.error, 'Bạn chưa đăng nhập');
});

test('/health remains a liveness check', async () => {
  const response = await request('/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
});

test('/ready reports database readiness when PostgreSQL is online', async () => {
  const response = await request('/ready');
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ready');
  assert.equal(response.body.database, 'ok');
});

test('/ready sanitizes database failures', async () => {
  const originalQueryRaw = prisma.$queryRaw;
  prisma.$queryRaw = async () => {
    const error = new Error('postgresql://sensitive-user:sensitive-password@database.example');
    error.code = 'P2028';
    throw error;
  };

  try {
    const response = await request('/ready');
    assert.equal(response.status, 503);
    assert.deepEqual(response.body, { status: 'not_ready', database: 'unavailable' });
    assert.ok(!JSON.stringify(response.body).includes('sensitive-password'));
  } finally {
    prisma.$queryRaw = originalQueryRaw;
  }
});

test('graceful shutdown closes HTTP before disconnecting Prisma', async () => {
  const calls = [];
  const shutdown = createGracefulShutdown({
    server: { close: (callback) => { calls.push('server.close'); callback(); } },
    prisma: { $disconnect: async () => { calls.push('prisma.$disconnect'); } },
    logger: { log: () => {}, error: () => {} },
    exit: (code) => { calls.push(`exit:${code}`); },
    timeoutMs: 100,
  });

  await shutdown('SIGTERM');
  assert.deepEqual(calls, ['server.close', 'prisma.$disconnect', 'exit:0']);
});

test('internal error log messages redact database URLs and credentials', () => {
  const message = sanitizeLogMessage('connection postgresql://user:password@db.example/app failed; token=abc123');
  assert.ok(!message.includes('password@db.example'));
  assert.ok(!message.includes('abc123'));
  assert.ok(message.includes('[REDACTED_DATABASE_URL]'));
  assert.ok(message.includes('token=[REDACTED]'));
});
