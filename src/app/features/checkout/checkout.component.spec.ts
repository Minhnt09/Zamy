import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { CheckoutComponent } from './checkout.component';
import { CheckoutService } from '../services/checkout.service';
import { ProductService } from '../services/product.service';
import { OrderService } from '../services/order.service';
import { testProviders } from '../../testing/test-providers';

describe('CheckoutComponent', () => {
  let component: CheckoutComponent;
  let fixture: ComponentFixture<CheckoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckoutComponent],
      providers: testProviders
    })
    .compileComponents();

    fixture = TestBed.createComponent(CheckoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the VNPay warning from an older backend without confirming a COD order', async () => {
    component.cart = [{ id: 2, qty: 1, selectedSize: 'S' }];
    component.form.setValue({
      fullName: 'Test Customer', phoneNumber: '0900000000', email: '',
      province: 'Province', district: 'District', address: 'Test Street', paymentMethod: 'vnpay',
    });
    spyOn(TestBed.inject(OrderService), 'hasPendingCheckout').and.resolveTo(true);
    const requests = spyOn(TestBed.inject(OrderService), 'createOrder').and.returnValue(of({
      data: { orderCode: 'ZAMY-TEST', payment: { provider: 'vnpay', status: 'pending' } },
      paymentWarning: 'Chưa thể tạo URL thanh toán.',
    }));

    await Promise.all([component.onSubmit(), component.onSubmit()]);

    expect(requests).toHaveBeenCalledTimes(1);
    expect(component.isCashOnDeliverySuccessVisible).toBeFalse();
    expect(component.submittedOrderCode).toBe('ZAMY-TEST');
    expect(component.submitError).toBe('Chưa thể tạo URL thanh toán.');
  });
  it('restores only the selected variant after the checkout service is recreated', () => {
    const draft = TestBed.inject(CheckoutService);
    draft.setProducts([{ id: 2, qty: 1, selectedSize: 'S', price: 200000 }]);
    const reloaded = new CheckoutService();
    expect(reloaded.getProducts()).toEqual([jasmine.objectContaining({ id: 2, qty: 1, selectedSize: 'S' })]);
    draft.clear();
    expect(new CheckoutService().getProducts()).toEqual([]);
  });

  it('prompts the buyer to confirm a new price before posting the order', async () => {
    component.cart = [{ id: 2, qty: 1, selectedSize: 'S', price: 200000 }];
    component.form.setValue({
      fullName: 'Test Customer', phoneNumber: '0900000000', email: '',
      province: 'Hà Nội', district: 'Phường test', address: 'Test Street', paymentMethod: 'cod',
    });
    const orders = TestBed.inject(OrderService);
    spyOn(orders, 'hasPendingCheckout').and.resolveTo(false);
    const create = spyOn(orders, 'createOrder');
    spyOn(TestBed.inject(ProductService), 'refreshProducts').and.returnValue(of([
      { id: 2, name: 'Đầm', image: '', price: 250000, variants: [{ size: 'S', stock: 2 }] },
    ]));
    await component.onSubmit();
    expect(create).not.toHaveBeenCalled();
    expect(component.total).toBe(250000);
    expect(component.submitError).toContain('Giá sản phẩm đã thay đổi');
    TestBed.inject(CheckoutService).clear();
  });
});
