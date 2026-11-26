import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import { OrderService } from '../services/order.service';
import { map, of, timer } from 'rxjs';
import { PaymentSuccessComponent } from './payment-success.component';
import { testProviders } from '../../testing/test-providers';

describe('PaymentSuccessComponent', () => {
  let component: PaymentSuccessComponent;
  let fixture: ComponentFixture<PaymentSuccessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentSuccessComponent],
      providers: testProviders
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentSuccessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  it('lets a slow polling request finish before checking again', fakeAsync(() => {
    const pending = { data: { orderCode: 'TEST', status: 'pending', payment: { provider: 'vnpay', status: 'pending' } } };
    const paid = { data: { ...pending.data, payment: { provider: 'vnpay', status: 'paid' } } };
    const request = spyOn(TestBed.inject(OrderService), 'getOrderByCode').and.returnValues(
      of(pending),
      timer(3000).pipe(map(() => paid)),
    );
    component.orderCode = 'TEST';
    component.check();
    tick(5000);
    expect(request).toHaveBeenCalledTimes(2);
    expect(component.status).toBe('PAID');
    expect(component.checking).toBeFalse();
  }));
});
