const cartService = require('../services/cart.service');

const sendResult = (res, result) => {
  if (result.error) return res.status(result.status || 400).json({ error: result.error });
  return res.status(result.status || 200).json({ data: result.data, ...(result.skipped ? { skipped: result.skipped } : {}) });
};

const getCart = async (req, res) => sendResult(res, await cartService.getCart(req.user.id));
const addItem = async (req, res) => sendResult(res, await cartService.addItem(req.user.id, req.body));
const updateItem = async (req, res) => sendResult(res, await cartService.updateItem(req.user.id, req.params.id, req.body));
const removeItem = async (req, res) => sendResult(res, await cartService.removeItem(req.user.id, req.params.id));
const clearCart = async (req, res) => sendResult(res, await cartService.clearCart(req.user.id));
const mergeCart = async (req, res) => sendResult(res, await cartService.mergeCart(req.user.id, req.body));

module.exports = { getCart, addItem, updateItem, removeItem, clearCart, mergeCart };
