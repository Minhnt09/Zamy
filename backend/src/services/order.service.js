const { stat } = require('fs');
const orders = require('../data/order.data')
const products = require('../data/product.data')

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

    //1) Validate customer
    if (!customer?.name || !customer?.phone || !customer?.address) {
        return { status: 400, error: 'Thiếu thông tin khách hàng' };
    }

    //2) Validate items
    if (!Array.isArray(items) || items.length === 0) {
        return { status: 400, error: 'Đơn hàng không có sản phẩm' };
    }

    //3) Kiểm tra tồn kho + tính tổng tiền (chưa trừ stock vội)
    let total = 0;
    const orderItems = [];

    for (const it of items) {
        const productId = Number(it.productId);
        const qty = Number(it.qty);

        if(!Number.isInteger(productId) || !Number.isInteger(qty) || productId <= 0 || qty <= 0) {
            return { status: 400, error: 'Dữ liệu sản phẩm không hợp lệ' };
        }

        const product = products.find(p => p.id === productId);
        if (!product) {
            return { status: 400, error: `Không tìm thấy sản phẩm id=${productId}` };
        }

        if (product.stock < qty) {
            return { status: 400, error: `Sản phẩm ${product.name} không đủ tồn kho` };
        }

        const subtotal = product.price * qty;
        total += subtotal;

        orderItems.push({
            productId,
            name: product.name,
            price: product.price,
            qty,
            subtotal
        });
    }

    //4) trừ stock (sau khi check hết)
    for (const it of orderItems){
        const p = products.find(p => p.id === it.productId);
        p.stock -= it.qty;
    }

    //5) Tạo oder
    const newOrder = {
        id: orders.length > 0 ? Math.max(...orders.map(o => o.id)) +1 : 1,
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
        return { status: 404, error: 'Không tìm thấy đơn hàng' };
    }
    return { status: 200, data: order };
}

function getAllOrders() {
    return { status: 200, data: orders };
}

function updateOrderStatus(ordercode, status) {
    const allowed = ['pending', 'confirmed', 'shipped', 'delivered', 'canceled'];
    if (!allowed.includes(status)) {
        return { status: 400, error: `status không hợp lệ. Cho phép: ${allowed.join(', ')}` };
    }

    const order = orders.find(o => o.orderCode === ordercode);
    if (!order) return { status: 404, error: 'Không tìm thấy đơn hàng' };

    order.status = status;
    return { status: 200, data: order };
}

module.exports = { createOrder, getOrderByCode, getAllOrders, updateOrderStatus };
