import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CartItem, CartservicesService } from '../services/cartservices.service';
import { CheckoutService } from '../services/checkout.service';
import { CreateOrderPayload, OrderService } from '../services/order.service';
import { ProductService } from '../services/product.service';
import { firstValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-checkout',
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './checkout.component.html',
})
export class CheckoutComponent {
  private readonly router = inject(Router);
  private readonly cartService = inject(CartservicesService);
  private readonly checkout = inject(CheckoutService);
  private readonly orders = inject(OrderService);
  private readonly products = inject(ProductService);

  readonly form = inject(FormBuilder).nonNullable.group({
    fullName: ['', [Validators.required, Validators.pattern(/\S/)]],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^\+?[\d\s.-]{9,16}$/)]],
    email: ['', Validators.email],
    province: ['', [Validators.required, Validators.pattern(/\S/)]],
    district: ['', [Validators.required, Validators.pattern(/\S/)]],
    address: ['', [Validators.required, Validators.pattern(/\S/)]],
    paymentMethod: ['cod' as 'cod' | 'vnpay', Validators.required],
  });
  readonly shippingFee = 20000;
  cart = this.checkout.getProducts();
  isSubmitting = false;
  submittedOrderCode = '';
  submitError = '';
  isCashOnDeliverySuccessVisible = false;

  get total() { return this.cart.reduce((sum, item) => sum + (item.price ?? 0) * (item.qty ?? 1), 0); }

  async onSubmit() {
    if (this.isSubmitting || this.submittedOrderCode || !this.cart.length) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.submitError = '';
    try {
      const payload = this.buildOrderPayload();
      if (!await this.orders.hasPendingCheckout(payload) && !await this.verifyProducts()) return;

      const response = await firstValueFrom(this.orders.createOrder(payload));
      this.submittedOrderCode = response.data.orderCode;
      this.checkout.clear();
      this.cartService.refreshCart();

      if (payload.paymentMethod === 'vnpay') {
        if (response.paymentUrl) window.location.assign(response.paymentUrl);
        else if (response.paymentWarning) this.submitError = response.paymentWarning;
        else void this.router.navigate(['/payment-success'], { queryParams: { orderCode: this.submittedOrderCode } });
        return;
      }
      this.isCashOnDeliverySuccessVisible = true;
    } catch (error) {
      this.submitError = error instanceof HttpErrorResponse
        ? error.error?.error || 'Không thể xác nhận đơn hàng. Vui lòng gửi lại với cùng thông tin.'
        : 'Không thể xác nhận đơn hàng. Vui lòng gửi lại với cùng thông tin.';
    } finally {
      this.isSubmitting = false;
    }
  }

  private buildOrderPayload(): CreateOrderPayload {
    const form = this.form.getRawValue();
    return {
      customer: {
        name: form.fullName.trim(), phone: form.phoneNumber.replace(/[\s.-]/g, ''), email: form.email.trim(),
        address: [form.address, form.district, form.province].map(part => part.trim()).join(', '),
      },
      paymentMethod: form.paymentMethod,
      items: this.cart.map(item => ({
        productId: Number(item.id), qty: item.qty ?? 1, size: item.selectedSize || item.size || '',
      })),
    };
  }

  private async verifyProducts(): Promise<boolean> {
    const list = await firstValueFrom(this.products.refreshProducts());
    const byId = new Map(list.map(product => [product.id, product]));
    const updated: CartItem[] = [];
    for (const item of this.cart) {
      const product = byId.get(Number(item.id));
      const size = item.selectedSize || item.size;
      const variant = product?.variants?.find(candidate => candidate.size === size);
      if (!product || !variant || variant.stock < (item.qty ?? 1)) {
        this.submitError = (item.name ?? 'Sản phẩm') + (size ? ' (size ' + size + ')' : '')
          + ' không còn đủ hàng. Vui lòng chọn lại sản phẩm.';
        return false;
      }
      updated.push({ ...item, price: product.price });
    }
    if (updated.some((item, index) => item.price !== this.cart[index].price)) {
      this.cart = updated;
      this.checkout.setProducts(updated);
      this.submitError = 'Giá sản phẩm đã thay đổi. Vui lòng kiểm tra tổng tiền mới và xác nhận lại.';
      return false;
    }
    return true;
  }
}
