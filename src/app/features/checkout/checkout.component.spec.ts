import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { CheckoutComponent } from './checkout.component';
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
});
