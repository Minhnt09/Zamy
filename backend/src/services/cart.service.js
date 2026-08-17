const prisma = require('../lib/prisma');

class CartInputError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const cartInclude = {
  items: {
    include: {
      productVariant: {
        include: { product: true },
      },
    },
    orderBy: { id: 'asc' },
  },
};

function normalizePositiveInteger(value, fieldName) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new CartInputError(400, `${fieldName} phải là số nguyên > 0`);
  }
  return number;
}

function normalizeSize(size) {
  const normalized = String(size || '').trim().toUpperCase();
  if (!normalized) throw new CartInputError(400, 'Size là bắt buộc');
  return normalized;
}

function toCartResponse(cart) {
  return {
    id: cart.id,
    items: cart.items
      .filter((item) => item.productVariant.isActive && item.productVariant.product.isActive)
      .map((item) => ({
        id: item.id,
        productId: item.productVariant.product.id,
        code: item.productVariant.product.code,
        name: item.productVariant.product.name,
        image: item.productVariant.product.image,
        color: item.productVariant.product.color,
        price: item.productVariant.product.price,
        size: item.productVariant.size,
        quantity: item.quantity,
        stock: item.productVariant.stockQuantity,
        subtotal: item.quantity * item.productVariant.product.price,
      })),
  };
}

async function getOrCreateCart(tx, userId) {
  return tx.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

async function getCartForUser(tx, userId) {
  const cart = await getOrCreateCart(tx, userId);
  const cartWithItems = await tx.cart.findUnique({ where: { id: cart.id }, include: cartInclude });
  const inactiveItemIds = cartWithItems.items
    .filter((item) => !item.productVariant.isActive || !item.productVariant.product.isActive)
    .map((item) => item.id);

  if (!inactiveItemIds.length) return cartWithItems;

  await tx.cartItem.deleteMany({ where: { id: { in: inactiveItemIds } } });
  return tx.cart.findUnique({ where: { id: cart.id }, include: cartInclude });
}

async function findActiveVariant(tx, productId, size) {
  return tx.productVariant.findFirst({
    where: {
      productId,
      size,
      isActive: true,
      product: { isActive: true },
    },
  });
}

function toServiceError(error) {
  if (error instanceof CartInputError) return { status: error.status, error: error.message };
  if (error?.code === 'P2002') return { status: 409, error: 'Cart item đã tồn tại, vui lòng thử lại' };
  return { status: 500, error: 'Không thể xử lý giỏ hàng' };
}

async function getCart(userId) {
  try {
    const cart = await prisma.$transaction((tx) => getCartForUser(tx, userId));
    return { status: 200, data: toCartResponse(cart) };
  } catch (error) {
    return toServiceError(error);
  }
}

async function addItem(userId, payload) {
  try {
    const productId = normalizePositiveInteger(payload?.productId, 'productId');
    const quantity = normalizePositiveInteger(payload?.quantity, 'quantity');
    const size = normalizeSize(payload?.size);

    const cart = await prisma.$transaction(async (tx) => {
      const cartRecord = await getOrCreateCart(tx, userId);
      const variant = await findActiveVariant(tx, productId, size);
      if (!variant) throw new CartInputError(404, 'Sản phẩm hoặc size không còn khả dụng');

      const existingItem = await tx.cartItem.findUnique({
        where: { cartId_productVariantId: { cartId: cartRecord.id, productVariantId: variant.id } },
      });
      const nextQuantity = (existingItem?.quantity || 0) + quantity;
      if (nextQuantity > variant.stockQuantity) {
        throw new CartInputError(400, 'Số lượng vượt quá tồn kho hiện tại');
      }

      if (existingItem) {
        await tx.cartItem.update({ where: { id: existingItem.id }, data: { quantity: nextQuantity } });
      } else {
        await tx.cartItem.create({ data: { cartId: cartRecord.id, productVariantId: variant.id, quantity } });
      }
      return getCartForUser(tx, userId);
    });
    return { status: 200, data: toCartResponse(cart) };
  } catch (error) {
    return toServiceError(error);
  }
}

async function updateItem(userId, itemId, payload) {
  try {
    const id = normalizePositiveInteger(itemId, 'cart item id');
    const quantity = normalizePositiveInteger(payload?.quantity, 'quantity');
    const cart = await prisma.$transaction(async (tx) => {
      const item = await tx.cartItem.findFirst({
        where: { id, cart: { userId } },
        include: { productVariant: { include: { product: true } } },
      });
      if (!item) throw new CartInputError(404, 'Không tìm thấy cart item');
      if (!item.productVariant.isActive || !item.productVariant.product.isActive) {
        throw new CartInputError(400, 'Sản phẩm hoặc size không còn khả dụng');
      }
      if (quantity > item.productVariant.stockQuantity) {
        throw new CartInputError(400, 'Số lượng vượt quá tồn kho hiện tại');
      }
      await tx.cartItem.update({ where: { id }, data: { quantity } });
      return getCartForUser(tx, userId);
    });
    return { status: 200, data: toCartResponse(cart) };
  } catch (error) {
    return toServiceError(error);
  }
}

async function removeItem(userId, itemId) {
  try {
    const id = normalizePositiveInteger(itemId, 'cart item id');
    const cart = await prisma.$transaction(async (tx) => {
      const item = await tx.cartItem.findFirst({ where: { id, cart: { userId } } });
      if (!item) throw new CartInputError(404, 'Không tìm thấy cart item');
      await tx.cartItem.delete({ where: { id } });
      return getCartForUser(tx, userId);
    });
    return { status: 200, data: toCartResponse(cart) };
  } catch (error) {
    return toServiceError(error);
  }
}

async function clearCart(userId) {
  try {
    const cart = await prisma.$transaction(async (tx) => {
      const cartRecord = await getOrCreateCart(tx, userId);
      await tx.cartItem.deleteMany({ where: { cartId: cartRecord.id } });
      return getCartForUser(tx, userId);
    });
    return { status: 200, data: toCartResponse(cart) };
  } catch (error) {
    return toServiceError(error);
  }
}

async function mergeCart(userId, payload) {
  if (!Array.isArray(payload?.items)) return { status: 400, error: 'items phải là một mảng' };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const cartRecord = await getOrCreateCart(tx, userId);
      const skipped = [];

      for (const [index, rawItem] of payload.items.entries()) {
        let productId;
        let quantity;
        let size;
        try {
          productId = normalizePositiveInteger(rawItem?.productId, 'productId');
          quantity = normalizePositiveInteger(rawItem?.quantity, 'quantity');
          size = normalizeSize(rawItem?.size);
        } catch (error) {
          skipped.push({ index, reason: error.message });
          continue;
        }

        const variant = await findActiveVariant(tx, productId, size);
        if (!variant || variant.stockQuantity <= 0) {
          skipped.push({ index, productId, size, reason: 'Sản phẩm hoặc size không còn khả dụng' });
          continue;
        }

        const existingItem = await tx.cartItem.findUnique({
          where: { cartId_productVariantId: { cartId: cartRecord.id, productVariantId: variant.id } },
        });
        const requestedQuantity = (existingItem?.quantity || 0) + quantity;
        const nextQuantity = Math.min(requestedQuantity, variant.stockQuantity);

        if (existingItem) {
          await tx.cartItem.update({ where: { id: existingItem.id }, data: { quantity: nextQuantity } });
        } else {
          await tx.cartItem.create({ data: { cartId: cartRecord.id, productVariantId: variant.id, quantity: nextQuantity } });
        }
        if (nextQuantity < requestedQuantity) {
          skipped.push({ index, productId, size, reason: 'Số lượng đã được giới hạn theo tồn kho' });
        }
      }

      return { cart: await getCartForUser(tx, userId), skipped };
    });
    return { status: 200, data: toCartResponse(result.cart), skipped: result.skipped };
  } catch (error) {
    return toServiceError(error);
  }
}

module.exports = { getCart, addItem, updateItem, removeItem, clearCart, mergeCart };
