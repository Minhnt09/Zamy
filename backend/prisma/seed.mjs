import "dotenv/config";
import { createRequire } from "node:module";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const require = createRequire(import.meta.url);
const mockProducts = require("../src/data/product.data.js");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL must be configured before running the seed.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const categories = [
  { name: "Dress", slug: "dress" },
  { name: "Shirt", slug: "shirt" },
  { name: "Trousers", slug: "trousers" },
  { name: "Skirt", slug: "skirt" },
];

const categorySlugByProductCode = {
  DSC001: "dress",
  DS002: "dress",
  DSC003: "dress",
  DSC004: "dress",
  DS005: "dress",
  DS006: "dress",
  DS007: "dress",
  DS008: "dress",
  DS009: "dress",
  DS010: "dress",
  DS011: "shirt",
  DS012: "shirt",
  DS013: "trousers",
  DS014: "trousers",
  DS015: "shirt",
  DS016: "trousers",
  DS017: "shirt",
  DS018: "skirt",
  DS019: "shirt",
  DS020: "skirt",
};

const stockByProductCode = {
  DSC001: { S: 5, M: 8, L: 7 },
  DS002: { M: 6, L: 4 },
  DSC003: { S: 4, M: 6, L: 5 },
  DSC004: { M: 11, L: 9 },
  DS005: { M: 9, L: 10, XL: 6 },
  DS006: { S: 7, M: 13, L: 10 },
  DS007: { S: 8, M: 10 },
  DS008: { S: 17, M: 23 },
  DS009: { M: 17, L: 20, XL: 13 },
  DS010: { S: 8, M: 13, L: 9 },
  DS011: { S: 11, M: 14 },
  DS012: { M: 8, L: 7 },
  DS013: { S: 2, M: 5, L: 3 },
  DS014: { M: 2, L: 2, XL: 1 },
  DS015: { M: 6, L: 4 },
  DS016: { L: 5, XL: 3 },
  DS017: { S: 5, M: 9, L: 6 },
  DS018: { M: 8, L: 7 },
  DS019: { S: 3, M: 5, L: 4 },
  DS020: { S: 3, M: 4, L: 3 },
};

function assertSeedInput() {
  if (mockProducts.length !== 20) {
    throw new Error(`Expected 20 mock products, received ${mockProducts.length}.`);
  }

  const codes = new Set();
  const skus = new Set();
  let variantCount = 0;

  for (const product of mockProducts) {
    if (codes.has(product.code)) throw new Error(`Duplicate product code: ${product.code}.`);
    codes.add(product.code);

    const categorySlug = categorySlugByProductCode[product.code];
    const stockBySize = stockByProductCode[product.code];
    const expectedSizes = [...product.sizes].sort();
    const seededSizes = Object.keys(stockBySize || {}).sort();

    if (!categorySlug) throw new Error(`Missing category mapping for ${product.code}.`);
    if (expectedSizes.join(",") !== seededSizes.join(",")) {
      throw new Error(`Seed sizes do not match mock sizes for ${product.code}.`);
    }

    const totalStock = Object.values(stockBySize).reduce((sum, stock) => sum + stock, 0);
    if (totalStock !== product.stock) {
      throw new Error(`Seed stock total does not match mock stock for ${product.code}.`);
    }

    for (const size of seededSizes) {
      const stock = stockBySize[size];
      const sku = `${product.code}-${size}`;

      if (!Number.isInteger(stock) || stock < 0) {
        throw new Error(`Invalid stock for ${sku}.`);
      }
      if (skus.has(sku)) throw new Error(`Duplicate variant SKU: ${sku}.`);

      skus.add(sku);
      variantCount += 1;
    }
  }

  if (variantCount !== 51) {
    throw new Error(`Expected 51 variants, received ${variantCount}.`);
  }
}

async function main() {
  assertSeedInput();

  await prisma.$transaction(async (tx) => {
    const categoryBySlug = new Map();

    for (const category of categories) {
      const savedCategory = await tx.category.upsert({
        where: { slug: category.slug },
        create: category,
        update: { name: category.name },
      });
      categoryBySlug.set(savedCategory.slug, savedCategory);
    }

    for (const mockProduct of mockProducts) {
      const category = categoryBySlug.get(categorySlugByProductCode[mockProduct.code]);
      const color = mockProduct.code === "DS015" ? "Trắng" : mockProduct.color;

      const product = await tx.product.upsert({
        where: { code: mockProduct.code },
        create: {
          id: mockProduct.id,
          code: mockProduct.code,
          name: mockProduct.name,
          price: mockProduct.price,
          color,
          image: mockProduct.image,
          categoryId: category.id,
          isActive: true,
        },
        update: {
          name: mockProduct.name,
          price: mockProduct.price,
          color,
          image: mockProduct.image,
          categoryId: category.id,
          isActive: true,
        },
      });

      for (const [size, stockQuantity] of Object.entries(stockByProductCode[mockProduct.code])) {
        const sku = `${mockProduct.code}-${size}`;

        await tx.productVariant.upsert({
          where: { sku },
          create: {
            productId: product.id,
            size,
            sku,
            stockQuantity,
            isActive: true,
          },
          update: {
            productId: product.id,
            size,
            stockQuantity,
            isActive: true,
          },
        });
      }
    }
  });

  console.log("Seed completed: 4 categories, 20 products, 51 product variants.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
