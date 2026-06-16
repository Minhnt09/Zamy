const products = require('../data/product.data');

function getAll() {
  return products;
}

function getById(id) {
  return products.find(p => p.id === id);
}

function normalizeSizes(size, sizes) {
  const source = Array.isArray(sizes) ? sizes : String(sizes || size || '').split(',');
  return source.map(item => String(item).trim()).filter(Boolean);
}

function create(payload) {
  const { name, image, price, color, size, sizes, stock, code } = payload;

  if (!name || !image || price === undefined || !code) {
    return { status: 400, error: 'Thieu field bat buoc: name, image, price, code' };
  }

  const priceNum = Number(price);
  const stockNum = stock === undefined ? 0 : Number(stock);
  const sizeOptions = normalizeSizes(size, sizes);

  if (Number.isNaN(priceNum) || priceNum < 0) {
    return { status: 400, error: 'price phai la so >= 0' };
  }
  if (Number.isNaN(stockNum) || stockNum < 0) {
    return { status: 400, error: 'stock phai la so >= 0' };
  }
  if (sizeOptions.length === 0) {
    return { status: 400, error: 'sizes khong duoc de trong' };
  }

  if (products.some(p => p.code === code)) {
    return { status: 409, error: 'code da ton tai' };
  }

  const newId = products.length ? Math.max(...products.map(p => p.id)) + 1 : 1;

  const newProduct = {
    id: newId,
    name,
    image,
    price: priceNum,
    color: color || '',
    size: sizeOptions[0],
    sizes: sizeOptions,
    stock: stockNum,
    code
  };

  products.push(newProduct);
  return { status: 201, data: newProduct };
}

function update(id, payload) {
  const index = products.findIndex(p => p.id === id);
  if (index === -1) return { status: 404, error: 'Product not found' };

  const { name, image, price, color, size, sizes, stock, code } = payload;

  if (name !== undefined) products[index].name = name;
  if (image !== undefined) products[index].image = image;

  if (price !== undefined) {
    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      return { status: 400, error: 'price phai la so >= 0' };
    }
    products[index].price = priceNum;
  }

  if (color !== undefined) products[index].color = color;
  if (size !== undefined || sizes !== undefined) {
    const sizeOptions = normalizeSizes(size, sizes);
    if (sizeOptions.length === 0) {
      return { status: 400, error: 'sizes khong duoc de trong' };
    }
    products[index].size = sizeOptions[0];
    products[index].sizes = sizeOptions;
  }

  if (stock !== undefined) {
    const stockNum = Number(stock);
    if (Number.isNaN(stockNum) || stockNum < 0) {
      return { status: 400, error: 'stock phai la so >= 0' };
    }
    products[index].stock = stockNum;
  }

  if (code !== undefined) {
    if (products.some(p => p.code === code && p.id !== id)) {
      return { status: 409, error: 'code da ton tai' };
    }
    products[index].code = code;
  }

  return { status: 200, data: products[index] };
}

function remove(id) {
  const index = products.findIndex(p => p.id === id);
  if (index === -1) return { status: 404, error: 'Product not found' };

  const deleted = products.splice(index, 1)[0];
  return { status: 200, data: deleted };
}

module.exports = { getAll, getById, create, update, remove };
