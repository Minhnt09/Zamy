const express = require('express');
const productRoutes = require('./product.route.js');
const orderRoutes = require('./order.route.js');
const cartRoutes = require('./cart.route.js');
const paymentRoutes = require('./payment.route.js');
const internalJobRoutes = require('./internal-job.route.js');

const router = express.Router();

router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/payments', paymentRoutes);
router.use('/internal', internalJobRoutes);
router.use('/orders', orderRoutes);

module.exports = router;
