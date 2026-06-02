import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type CreateOrderPayload = {
  customer: {
    name: string;
    phone: string;
    email: string;
    address: string;
  };
  paymentMethod?: 'cod' | 'vnpay';
  shippingFee?: number;
  items: { productId: number; qty: number }[];
};

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  createOrder(payload: CreateOrderPayload): Observable<any>{
    return this.http.post(`${this.baseUrl}/orders`, payload);
  }

  getOrderByCode(orderCode: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/orders/${orderCode}`);
  }
}
