const orders = require('../data/order.data');
const products = require('../data/product.data');

function geneateOrderCode() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const running = String(orders.length + 1).padStart(4, '0');
    return `ZAMY-${y}${m}${day}-${running}`;
}

function createOrder(payload) {
    const { customer, items, paymentMethod = 'cod', shippingFee = 0 } = payload;

    if (!customer?.name || !customer?.phone || !customer?.address) {
        return { status: 400, error: 'Thieu thong tin khach hang' };
    }

    if (!Array.isArray(items) || items.length === 0) {
        return { status: 400, error: 'Don hang khong co san pham' };
    }

    let total = 0;
    const orderItems = [];

    for (const it of items) {
        const productId = Number(it.productId);
        const qty = Number(it.qty);

        if (!Number.isInteger(productId) || !Number.isInteger(qty) || productId <= 0 || qty <= 0) {
            return { status: 400, error: 'Du lieu san pham khong hop le' };
        }

        const product = products.find(p => p.id === productId);
        if (!product) {
            return { status: 400, error: `Khong tim thay san pham id=${productId}` };
        }

        const selectedSize = String(it.size || it.selectedSize || '').trim();
        const productSizes = Array.isArray(product.sizes) && product.sizes.length > 0
            ? product.sizes
            : [product.size].filter(Boolean);

        if (!selectedSize || !productSizes.includes(selectedSize)) {
            return { status: 400, error: `Size san pham ${product.name} khong hop le` };
        }

        if (product.stock < qty) {
            return { status: 400, error: `San pham ${product.name} khong du ton kho` };
        }

        const subtotal = product.price * qty;
        total += subtotal;

        orderItems.push({
            productId,
            name: product.name,
            price: product.price,
            size: selectedSize,
            qty,
            subtotal
        });
    }

    for (const it of orderItems) {
        const p = products.find(p => p.id === it.productId);
        p.stock -= it.qty;
    }

    const newOrder = {
        id: orders.length > 0 ? Math.max(...orders.map(o => o.id)) + 1 : 1,
        orderCode: geneateOrderCode(),
        customer,
        items: orderItems,
        total,
        paymentMethod,
        shippingFee,
        grandTotal: total + shippingFee,
        paymentStatus: paymentMethod === 'vnpay' ? 'pending' : 'unpaid',
        status: 'pending',
        createAt: new Date().toISOString()
    };

    orders.push(newOrder);
    return { status: 201, data: newOrder };
}

function getOrderByCode(orderCode) {
    const order = orders.find(o => o.orderCode === orderCode);
    if (!order) {
        return { status: 404, error: 'Khong tim thay don hang' };
    }
    return { status: 200, data: order };
}

function getAllOrders() {
    return { status: 200, data: orders };
}

function updateOrderStatus(ordercode, status) {
    const allowed = ['pending', 'confirmed', 'shipped', 'delivered', 'canceled'];
    if (!allowed.includes(status)) {
        return { status: 400, error: `status khong hop le. Cho phep: ${allowed.join(', ')}` };
    }

    const order = orders.find(o => o.orderCode === ordercode);
    if (!order) return { status: 404, error: 'Khong tim thay don hang' };

    order.status = status;
    return { status: 200, data: order };
}

module.exports = { createOrder, getOrderByCode, getAllOrders, updateOrderStatus };
