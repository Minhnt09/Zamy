const express = require('express');
const { requireAuth } = require('../middlewares/auth.middleware');
const cartController = require('../controllers/cart.controller');

const router = express.Router();

router.use(requireAuth);
router.get('/', cartController.getCart);
router.post('/items', cartController.addItem);
router.patch('/items/:id', cartController.updateItem);
router.delete('/items/:id', cartController.removeItem);
router.delete('/', cartController.clearCart);
router.post('/merge', cartController.mergeCart);

module.exports = router;
