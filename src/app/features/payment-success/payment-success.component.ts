import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { OrderService } from '../services/order.service';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './payment-success.component.html',
  styleUrl: './payment-success.component.scss'
})
export class PaymentSuccessComponent {
  order: any = null;
  orderCode: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService,
  ) {}

  ngOnInit() {
    this.route.queryParamMap.subscribe(params => {
      this.orderCode = params.get('orderCode');

      if (!this.orderCode) return;


      this.orderService.getOrderByCode(this.orderCode).subscribe({
        next: (res: any) => {
          this.order = res.data;
          console.log('this.order:', this.order);
        },
        });
    });
  }
}
