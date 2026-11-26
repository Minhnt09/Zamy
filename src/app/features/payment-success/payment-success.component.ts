import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, TimeoutError, expand, finalize, switchMap, tap, timer, timeout } from 'rxjs';
import { OrderService, OrderStatusResponse } from '../services/order.service';
import { HttpErrorResponse } from '@angular/common/http';

const POLL_DELAY = 2_000;
const POLL_DEADLINE = 45_000;

@Component({
  selector: 'app-payment-success',
  imports: [RouterLink],
  templateUrl: './payment-success.component.html',
})
export class PaymentSuccessComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly orders = inject(OrderService);
  private readonly destroyRef = inject(DestroyRef);
  order?: OrderStatusResponse['data'];
  orderCode = '';
  checking = false;
  message = '';

  ngOnInit() {
    this.orderCode = this.route.snapshot.queryParamMap.get('orderCode')?.trim() ?? '';
    if (this.orderCode) this.check();
    else this.message = 'Không tìm thấy mã đơn hàng.';
  }

  get status() { return this.order?.payment?.status?.toUpperCase(); }

  check() {
    if (!this.orderCode || this.checking) return;
    this.checking = true;
    this.message = '';
    const deadline = Date.now() + POLL_DEADLINE;
    const load = () => this.orders.getOrderByCode(this.orderCode).pipe(timeout({ first: Math.max(1, deadline - Date.now()) }));
    load().pipe(
      expand(({ data }) => {
        if (data.payment?.provider !== 'vnpay' || data.payment.status.toUpperCase() !== 'PENDING') return EMPTY;
        if (Date.now() + POLL_DELAY >= deadline) {
          this.message = 'Đơn hàng vẫn đang chờ xác nhận. Bạn có thể kiểm tra lại.';
          return EMPTY;
        }
        return timer(POLL_DELAY).pipe(switchMap(load));
      }),
      tap(({ data }) => { this.order = data; }),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => { this.checking = false; }),
    ).subscribe({
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 401) this.message = 'Đăng nhập lại để xem trạng thái đơn hàng.';
        else if (error instanceof TimeoutError) this.message = 'Chưa nhận được phản hồi. Vui lòng kiểm tra lại.';
        else this.message = 'Không thể tải trạng thái đơn hàng. Vui lòng kiểm tra lại.';
      },
    });
  }
}
