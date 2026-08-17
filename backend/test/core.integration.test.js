require('dotenv').config();

const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');
const { hashPassword } = require('../src/services/user.service');

const databaseUrl = new URL(process.env.DATABASE_URL);
const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
if (!localHosts.has(databaseUrl.hostname)) {
  throw new Error('Core integration tests only run against a local PostgreSQL DATABASE_URL');
}

const runPrefix = `core-test-${Date.now()}`;
const password = 'CoreTestPassword123!';
let server;
let baseUrl;
let sequence = 0;

const nextEmail = (label) => `${runPrefix}-${label}-${++sequence}@example.test`;

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  let body;
  try {
    body = await response.json();
  } catch {
    body = await response.text();
  }
  return { status: response.status, body };
};

const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
});

async function registerCustomer(email = nextEmail('customer')) {
  const response = await request('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Core Test Customer', email, password }),
  });
  assert.equal(response.status, 201);
  return { email, user: response.body.user, token: response.body.token };
}

async function pickVariant() {
  const products = await request('/products');
  assert.equal(products.status, 200);
  const product = products.body.data.find((candidate) => candidate.variants?.some((variant) => variant.stock >= 2));
  const apiVariant = product?.variants?.find((variant) => variant.stock >= 2);
  assert.ok(product && apiVariant, 'an active product variant with stock >= 2 is required');

  const variant = await prisma.productVariant.findFirst({
    where: { productId: product.id, size: apiVariant.size },
    select: { id: true, stockQuantity: true },
  });
  assert.ok(variant);
  return { product, apiVariant, variant, stockBefore: variant.stockQuantity };
}

async function cleanup({ emails = [], variantId, stockBefore }) {
  if (variantId && Number.isInteger(stockBefore)) {
    await prisma.productVariant.update({ where: { id: variantId }, data: { stockQuantity: stockBefore } });
  }

  if (emails.length) {
    const users = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true } });
    const userIds = users.map((user) => user.id);
    if (userIds.length) {
      const orders = await prisma.order.findMany({ where: { userId: { in: userIds } }, select: { id: true } });
      const orderIds = orders.map((order) => order.id);
      if (orderIds.length) {
        await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
        await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
        await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
      }
      const carts = await prisma.cart.findMany({ where: { userId: { in: userIds } }, select: { id: true } });
      const cartIds = carts.map((cart) => cart.id);
      if (cartIds.length) {
        await prisma.cartItem.deleteMany({ where: { cartId: { in: cartIds } } });
        await prisma.cart.deleteMany({ where: { id: { in: cartIds } } });
      }
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
  }

  if (variantId && Number.isInteger(stockBefore)) {
    const variant = await prisma.productVariant.findUnique({ where: { id: variantId }, select: { stockQuantity: true } });
    assert.equal(variant?.stockQuantity, stockBefore, 'cleanup must restore stock exactly');
  }
  if (emails.length) {
    assert.equal(await prisma.user.count({ where: { email: { in: emails } } }), 0, 'cleanup must remove test users');
  }
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

test('register and login persist a hashed CUSTOMER and reject invalid credentials', async () => {
  const email = nextEmail('auth');
  try {
    const registered = await registerCustomer(email);
    assert.equal(registered.user.email, email);
    assert.equal(registered.user.role, 'user');
    assert.ok(registered.token);

    const dbUser = await prisma.user.findUnique({ where: { email } });
    assert.equal(dbUser.role, 'CUSTOMER');
    assert.notEqual(dbUser.passwordHash, password);
    assert.ok(dbUser.passwordHash.startsWith('pbkdf2$'));

    const login = await request('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    assert.equal(login.status, 200);
    assert.ok(login.body.token);

    const wrongPassword = await request('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'WrongPassword123!' }) });
    assert.equal(wrongPassword.status, 401);

    const duplicate = await request('/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Duplicate', email, password }) });
    assert.equal(duplicate.status, 409);
  } finally {
    await cleanup({ emails: [email] });
  }
});

test('products and cart are backed by PostgreSQL without reserving stock', async () => {
  const email = nextEmail('cart');
  let picked;
  try {
    const customer = await registerCustomer(email);
    picked = await pickVariant();
    assert.ok(Array.isArray(picked.product.sizes));
    assert.equal(typeof picked.product.price, 'number');
    assert.ok(picked.product.color);

    const add = await request('/cart/items', { method: 'POST', headers: authHeaders(customer.token), body: JSON.stringify({ productId: picked.product.id, size: picked.apiVariant.size, quantity: 1 }) });
    assert.equal(add.status, 200);
    assert.ok(add.body.data.items.some((item) => item.productId === picked.product.id && item.size === picked.apiVariant.size && item.quantity === 1));

    const stockAfterAdd = await prisma.productVariant.findUnique({ where: { id: picked.variant.id }, select: { stockQuantity: true } });
    assert.equal(stockAfterAdd.stockQuantity, picked.stockBefore);

    const cart = await request('/cart', { headers: authHeaders(customer.token) });
    assert.equal(cart.status, 200);
    assert.ok(cart.body.data.items.some((item) => item.productId === picked.product.id && item.size === picked.apiVariant.size && item.quantity === 1));
  } finally {
    await cleanup({ emails: [email], variantId: picked?.variant.id, stockBefore: picked?.stockBefore });
  }
});

test('COD checkout persists snapshots, enforces ownership, and rolls back insufficient stock', async () => {
  const customerAEmail = nextEmail('checkout-a');
  const customerBEmail = nextEmail('checkout-b');
  let picked;
  try {
    const customerA = await registerCustomer(customerAEmail);
    const customerB = await registerCustomer(customerBEmail);
    picked = await pickVariant();

    const add = await request('/cart/items', { method: 'POST', headers: authHeaders(customerA.token), body: JSON.stringify({ productId: picked.product.id, size: picked.apiVariant.size, quantity: 1 }) });
    assert.equal(add.status, 200);

    const checkout = await request('/orders', {
      method: 'POST',
      headers: authHeaders(customerA.token),
      body: JSON.stringify({
        customer: { name: 'Core Checkout', phone: '0900000000', email: customerAEmail, address: 'Core Test Street' },
        paymentMethod: 'cod',
        items: [{ productId: picked.product.id, size: picked.apiVariant.size, qty: 1, price: 1 }],
      }),
    });
    assert.equal(checkout.status, 201);
    assert.equal(checkout.body.data.payment.provider, 'cod');
    assert.equal(checkout.body.data.payment.status, 'pending');

    const order = await prisma.order.findUnique({ where: { id: checkout.body.data.id }, include: { items: true, payments: true } });
    const dbProduct = await prisma.product.findUnique({ where: { id: picked.product.id }, select: { price: true } });
    assert.equal(order.status, 'PENDING');
    assert.equal(order.items.length, 1);
    assert.equal(order.items[0].productVariantId, picked.variant.id);
    assert.equal(order.items[0].unitPrice, dbProduct.price, 'server-side price snapshot must ignore client price');
    assert.equal(order.shippingFee, 20000);
    assert.equal(order.grandTotal, dbProduct.price + 20000);
    assert.equal(order.payments[0].provider, 'COD');
    assert.equal(order.payments[0].status, 'PENDING');

    const stockAfterCheckout = await prisma.productVariant.findUnique({ where: { id: picked.variant.id }, select: { stockQuantity: true } });
    assert.equal(stockAfterCheckout.stockQuantity, picked.stockBefore - 1);

    const cartAfter = await request('/cart', { headers: authHeaders(customerA.token) });
    assert.equal(cartAfter.status, 200);
    assert.ok(!cartAfter.body.data.items.some((item) => item.productId === picked.product.id && item.size === picked.apiVariant.size));

    const ownOrder = await request(`/orders/${encodeURIComponent(checkout.body.data.orderCode)}`, { headers: authHeaders(customerA.token) });
    assert.equal(ownOrder.status, 200);
    assert.equal(ownOrder.body.data.payment.provider, 'cod');
    assert.equal(ownOrder.body.data.payment.status, 'pending');

    const foreignOrder = await request(`/orders/${encodeURIComponent(checkout.body.data.orderCode)}`, { headers: authHeaders(customerB.token) });
    assert.equal(foreignOrder.status, 403);

    const beforeCounts = { orders: await prisma.order.count({ where: { userId: customerA.user.id } }), payments: await prisma.payment.count({ where: { order: { userId: customerA.user.id } } }) };
    const insufficient = await request('/orders', {
      method: 'POST',
      headers: authHeaders(customerA.token),
      body: JSON.stringify({ customer: { name: 'Core Checkout', phone: '0900000000', email: customerAEmail, address: 'Core Test Street' }, paymentMethod: 'cod', items: [{ productId: picked.product.id, size: picked.apiVariant.size, qty: stockAfterCheckout.stockQuantity + 1 }] }),
    });
    assert.equal(insufficient.status, 400);
    assert.equal(await prisma.order.count({ where: { userId: customerA.user.id } }), beforeCounts.orders);
    assert.equal(await prisma.payment.count({ where: { order: { userId: customerA.user.id } } }), beforeCounts.payments);
    const stockAfterRejectedOrder = await prisma.productVariant.findUnique({ where: { id: picked.variant.id }, select: { stockQuantity: true } });
    assert.equal(stockAfterRejectedOrder.stockQuantity, stockAfterCheckout.stockQuantity);
  } finally {
    await cleanup({ emails: [customerAEmail, customerBEmail], variantId: picked?.variant.id, stockBefore: picked?.stockBefore });
  }
});

test('admin authentication is DB-only and admin middleware enforces roles', async () => {
  const customerEmail = nextEmail('admin-customer');
  const adminEmail = nextEmail('admin');
  const legacyEmail = nextEmail('legacy-env');
  const originalLegacyEmail = process.env.ADMIN_EMAIL;
  const originalLegacyPassword = process.env.ADMIN_PASSWORD;
  try {
    const customer = await registerCustomer(customerEmail);
    const customerAdminLogin = await request('/auth/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: customerEmail, password }) });
    assert.equal(customerAdminLogin.status, 401);

    const admin = await prisma.user.create({ data: { name: 'Core Test Admin', email: adminEmail, passwordHash: await hashPassword(password), role: 'ADMIN' } });
    const adminLogin = await request('/auth/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: adminEmail, password }) });
    assert.equal(adminLogin.status, 200);
    assert.equal(adminLogin.body.user.id, admin.id);
    assert.equal(adminLogin.body.user.role, 'admin');

    const adminWrongPassword = await request('/auth/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: adminEmail, password: 'WrongPassword123!' }) });
    assert.equal(adminWrongPassword.status, 401);

    const adminProtected = await request('/products', { method: 'POST', headers: authHeaders(adminLogin.body.token), body: JSON.stringify({}) });
    assert.equal(adminProtected.status, 400, 'ADMIN token must pass middleware and reach controller validation');
    const customerProtected = await request('/products', { method: 'POST', headers: authHeaders(customer.token), body: JSON.stringify({}) });
    assert.equal(customerProtected.status, 403);

    process.env.ADMIN_EMAIL = legacyEmail;
    process.env.ADMIN_PASSWORD = password;
    const legacyFallback = await request('/auth/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: legacyEmail, password }) });
    assert.equal(legacyFallback.status, 401);
  } finally {
    if (originalLegacyEmail === undefined) delete process.env.ADMIN_EMAIL; else process.env.ADMIN_EMAIL = originalLegacyEmail;
    if (originalLegacyPassword === undefined) delete process.env.ADMIN_PASSWORD; else process.env.ADMIN_PASSWORD = originalLegacyPassword;
    await cleanup({ emails: [customerEmail, adminEmail] });
  }
});
