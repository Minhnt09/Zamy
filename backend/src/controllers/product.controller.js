const productService = require('../services/product.service');

const getAllProducts = async (req, res, next) => {
  try {
    const data = await productService.getAll();
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const product = await productService.getById(id);

    if (!product) return res.status(404).json({ error: 'Product not found' });
    return res.json({ data: product });
  } catch (error) {
    return next(error);
  }
};

const createProduct = async (req, res) => {
  const result = await productService.create(req.body);
  if (result.error) return res.status(result.status || 400).json({ error: result.error });

  return res.status(201).json({ message: 'Tạo sản phẩm thành công', data: result.data });
};

const updateProduct = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const result = await productService.update(id, req.body);

  if (result.error) return res.status(result.status || 400).json({ error: result.error });
  return res.json({ message: 'Cập nhật sản phẩm thành công', data: result.data });
};

const deleteProduct = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const result = await productService.remove(id);

  if (result.error) return res.status(result.status || 404).json({ error: result.error });
  return res.json({ message: 'Xóa sản phẩm thành công', data: result.data });
};

module.exports = { getAllProducts, getProductById, createProduct, updateProduct, deleteProduct };
