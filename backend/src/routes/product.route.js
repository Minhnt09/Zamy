// routes/product.route.js
const express = require('express');
const router = express.Router();

const productController = require('../controllers/product.controller');
const { verifyAdmin } = require('../middlewares/auth.middleware');
const { getAllProducts, getProductById, createProduct, updateProduct, deleteProduct } = require('../controllers/product.controller');

router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.post('/', verifyAdmin, productController.createProduct);
router.put('/:id', verifyAdmin, productController.updateProduct);
router.delete('/:id', verifyAdmin, productController.deleteProduct);

module.exports = router;
