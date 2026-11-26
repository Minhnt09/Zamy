require('dotenv').config();

const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');

const app = require('../src/app');
const prisma = require('../src/lib/prisma');
const { RATE_LIMIT_MESSAGE } = require('../src/middlewares/rateLimiters');

let server;
let baseUrl;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  let body;
  try {
    body = await response.json();
  } catch {
    body = await response.text();
  }
  return { status: response.status, body, headers: response.headers };
}

async function assertRateLimited(path, { max, options }) {
  for (let attempt = 0; attempt < max; attempt += 1) {
    const response = await request(path, options);
    assert.notEqual(response.status, 429, `request ${attempt + 1} should remain below the limit`);
  }

  const limited = await request(path, options);
  assert.equal(limited.status, 429);
  assert.deepEqual(limited.body, { message: RATE_LIMIT_MESSAGE });
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

test('Helmet supplies a representative security header', async () => {
  const response = await request('/health');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
});

test('register limiter returns the standard JSON 429 response', async () => {
  await assertRateLimited('/auth/register', {
    max: 10,
    options: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
  });
});

test('login limiter returns the standard JSON 429 response', async () => {
  await assertRateLimited('/auth/login', {
    max: 10,
    options: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
  });
});

test('admin login limiter returns the standard JSON 429 response', async () => {
  await assertRateLimited('/auth/admin/login', {
    max: 10,
    options: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
  });
});

test('checkout limiter runs before authentication and does not create orders', async () => {
  await assertRateLimited('/orders', {
    max: 10,
    options: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
  });
});

test('internal job limiter supplements, rather than replaces, secret validation', async () => {
  await assertRateLimited('/internal/jobs/vnpay-timeout', {
    max: 5,
    options: { method: 'POST', headers: { 'x-internal-job-secret': 'wrong-secret' } },
  });
});
