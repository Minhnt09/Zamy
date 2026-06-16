const productService = require('../services/product.service');

const getAllProducts = (req, res) => {
  const data = productService.getAll();
  return res.json({ data });
};

const getProductById = (req, res) => {
  const id = parseInt(req.params.id, 10);
  const product = productService.getById(id);

  if (!product) return res.status(404).json({ error: 'Product not found' });
  return res.json({ data: product });
};

const createProduct = (req, res) => {
  const result = productService.create(req.body);
  if (result.error) return res.status(result.status || 400).json({ error: result.error });

  return res.status(201).json({ message: 'Tạo sản phẩm thành công', data: result.data });
};

const updateProduct = (req, res) => {
  const id = parseInt(req.params.id, 10);
  const result = productService.update(id, req.body);

  if (result.error) return res.status(result.status || 400).json({ error: result.error });
  return res.json({ message: 'Cập nhật sản phẩm thành công', data: result.data });
};

const deleteProduct = (req, res) => {
  const id = parseInt(req.params.id, 10);
  const result = productService.remove(id);

  if (result.error) return res.status(result.status || 404).json({ error: result.error });
  return res.json({ message: 'Xóa sản phẩm thành công', data: result.data });
};

module.exports = { getAllProducts, getProductById, createProduct, updateProduct, deleteProduct };
