const prisma = require('../lib/prisma');

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const ALLOWED_SIZES = new Set(SIZE_ORDER);
const productReadInclude = {
  category: { select: { name: true, slug: true } },
  variants: { where: { isActive: true }, select: { size: true, stockQuantity: true } },
};

class ProductInputError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function sortSizes(left, right) {
  return SIZE_ORDER.indexOf(left) - SIZE_ORDER.indexOf(right) || left.localeCompare(right);
}

function toProductResponse(product) {
  const variants = [...product.variants].sort((left, right) => sortSizes(left.size, right.size));
  const sizes = variants.map((variant) => variant.size);

  return {
    id: product.id,
    name: product.name,
    image: product.image,
    price: product.price,
    color: product.color,
    size: sizes[0] || '',
    sizes,
    variants: variants.map((variant) => ({ size: variant.size, stock: variant.stockQuantity })),
    stock: variants.reduce((total, variant) => total + variant.stockQuantity, 0),
    code: product.code,
    category: product.category.slug,
  };
}

function requiredText(value, fieldName) {
  const normalized = String(value ?? '').trim();
  if (!normalized) throw new ProductInputError(400, `${fieldName} is required`);
  return normalized;
}

function normalizeVariants(variants) {
  if (!Array.isArray(variants) || variants.length === 0) {
    throw new ProductInputError(400, 'At least one variant is required');
  }

  const sizes = new Set();
  return variants.map((variant) => {
    const size = String(variant?.size ?? '').trim().toUpperCase();
    const stock = Number(variant?.stock);

    if (!ALLOWED_SIZES.has(size)) throw new ProductInputError(400, `Invalid size: ${size || '(empty)'}`);
    if (sizes.has(size)) throw new ProductInputError(400, `Duplicate size: ${size}`);
    if (!Number.isInteger(stock) || stock < 0) {
      throw new ProductInputError(400, `Stock for size ${size} must be an integer >= 0`);
    }

    sizes.add(size);
    return { size, stockQuantity: stock };
  });
}

function normalizePayload(payload, { requireCode }) {
  const price = Number(payload?.price);
  if (!Number.isInteger(price) || price <= 0) {
    throw new ProductInputError(400, 'Price must be an integer > 0');
  }

  const input = {
    name: requiredText(payload?.name, 'Name'),
    price,
    color: requiredText(payload?.color, 'Color'),
    image: requiredText(payload?.image, 'Image'),
    category: requiredText(payload?.category, 'Category').toLowerCase(),
    variants: normalizeVariants(payload?.variants),
  };

  if (requireCode) input.code = requiredText(payload?.code, 'Code').toUpperCase();
  if (!requireCode && payload?.code !== undefined) input.code = requiredText(payload.code, 'Code').toUpperCase();

  if (payload?.isActive !== undefined) {
    if (typeof payload.isActive !== 'boolean') throw new ProductInputError(400, 'isActive must be a boolean');
    input.isActive = payload.isActive;
  }

  return input;
}

function toServiceError(error) {
  if (error instanceof ProductInputError) return { status: error.status, error: error.message };
  if (error?.code === 'P2002') {
    const target = Array.isArray(error.meta?.target) ? error.meta.target.join(',') : String(error.meta?.target || '');
    if (target.includes('code')) return { status: 409, error: 'Product code already exists' };
    if (target.includes('sku')) return { status: 409, error: 'Variant SKU already exists' };
    return { status: 409, error: 'Product or variant already exists' };
  }
  return { status: 500, error: 'Unable to save product' };
}

async function getAll() {
  const products = await prisma.product.findMany({
    where: { isActive: true }, include: productReadInclude, orderBy: { id: 'asc' },
  });
  return products.map(toProductResponse);
}

async function getById(id) {
  if (!Number.isInteger(id) || id <= 0) return null;
  const product = await prisma.product.findFirst({ where: { id, isActive: true }, include: productReadInclude });
  return product ? toProductResponse(product) : null;
}

async function create(payload) {
  try {
    const input = normalizePayload(payload, { requireCode: true });
    const product = await prisma.$transaction(async (tx) => {
      const [category, existingProduct] = await Promise.all([
        tx.category.findUnique({ where: { slug: input.category } }),
        tx.product.findUnique({ where: { code: input.code } }),
      ]);
      if (!category) throw new ProductInputError(400, 'Category not found');
      if (existingProduct) throw new ProductInputError(409, 'Product code already exists');

      return tx.product.create({
        data: {
          code: input.code, name: input.name, price: input.price, color: input.color, image: input.image,
          categoryId: category.id, isActive: input.isActive ?? true,
          variants: { create: input.variants.map((variant) => ({
            ...variant, sku: `${input.code}-${variant.size}`, isActive: true,
          })) },
        },
      });
    });
    return { status: 201, data: { id: product.id, code: product.code } };
  } catch (error) {
    return toServiceError(error);
  }
}

async function update(id, payload) {
  if (!Number.isInteger(id) || id <= 0) return { status: 404, error: 'Product not found' };

  try {
    const input = normalizePayload(payload, { requireCode: false });
    const product = await prisma.$transaction(async (tx) => {
      const existingProduct = await tx.product.findUnique({ where: { id }, include: { variants: true } });
      if (!existingProduct) throw new ProductInputError(404, 'Product not found');
      if (input.code && input.code !== existingProduct.code) {
        throw new ProductInputError(400, 'Product code cannot be changed');
      }

      const category = await tx.category.findUnique({ where: { slug: input.category } });
      if (!category) throw new ProductInputError(400, 'Category not found');

      const incomingSizes = new Set(input.variants.map((variant) => variant.size));
      await tx.product.update({
        where: { id },
        data: {
          name: input.name, price: input.price, color: input.color, image: input.image, categoryId: category.id,
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        },
      });

      for (const variant of input.variants) {
        const existingVariant = existingProduct.variants.find((item) => item.size === variant.size);
        if (existingVariant) {
          await tx.productVariant.update({
            where: { id: existingVariant.id },
            data: { stockQuantity: variant.stockQuantity, isActive: true },
          });
        } else {
          await tx.productVariant.create({
            data: {
              productId: id, size: variant.size, sku: `${existingProduct.code}-${variant.size}`,
              stockQuantity: variant.stockQuantity, isActive: true,
            },
          });
        }
      }

      await tx.productVariant.updateMany({
        where: { productId: id, size: { notIn: [...incomingSizes] }, isActive: true },
        data: { isActive: false },
      });
      return existingProduct;
    });
    return { status: 200, data: { id: product.id, code: product.code } };
  } catch (error) {
    return toServiceError(error);
  }
}

async function remove(id) {
  if (!Number.isInteger(id) || id <= 0) return { status: 404, error: 'Product not found' };

  try {
    const product = await prisma.$transaction(async (tx) => {
      const existingProduct = await tx.product.findUnique({ where: { id } });
      if (!existingProduct) throw new ProductInputError(404, 'Product not found');
      await tx.productVariant.updateMany({ where: { productId: id, isActive: true }, data: { isActive: false } });
      return tx.product.update({ where: { id }, data: { isActive: false } });
    });
    return { status: 200, data: { id: product.id, isActive: product.isActive } };
  } catch (error) {
    return toServiceError(error);
  }
}

module.exports = { getAll, getById, create, update, remove };
