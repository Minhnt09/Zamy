import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { CreateOrderPayload, OrderService } from './order.service';

describe('OrderService checkout retries', () => {
  it('retains the key after a lost response and releases it after confirmation', fakeAsync(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { getToken: () => 'test', getCurrentUser: () => ({ id: 1 }) } },
      ],
    });
    spyOn(crypto.subtle, 'digest').and.returnValue(Promise.resolve(new Uint8Array(32).buffer));
    const http = TestBed.inject(HttpTestingController);
    const url = `${environment.apiUrl}/orders`;
    const payload: CreateOrderPayload = {
      customer: { name: 'Test', phone: '0900000000', email: '', address: 'Test address' },
      items: [{ productId: 1, qty: 1, size: 'M' }],
    };
    const firstService = TestBed.inject(OrderService);
    firstService.createOrder(payload).subscribe({ error: () => undefined });
    flushMicrotasks();
    const first = http.expectOne(url);
    const firstKey = first.request.headers.get('Idempotency-Key');
    expect(firstKey).toBeTruthy();
    first.error(new ProgressEvent('error'));

    const reloaded = new OrderService(TestBed.inject(HttpClient), TestBed.inject(AuthService));
    const confirmation = { data: { orderCode: 'ZAMY-TEST', payment: null } };
    reloaded.createOrder(payload).subscribe();
    flushMicrotasks();
    const retry = http.expectOne(url);
    expect(retry.request.headers.get('Idempotency-Key')).toBe(firstKey);
    retry.flush(confirmation);

    reloaded.createOrder(payload).subscribe();
    flushMicrotasks();
    const next = http.expectOne(url);
    expect(next.request.headers.get('Idempotency-Key')).not.toBe(firstKey);
    next.flush(confirmation);
    http.verify();
  }));
});
