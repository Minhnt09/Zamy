import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export type CreateOrderPayload = {
  customer: {
    name: string;
    phone: string;
    email: string;
    address: string;
  };
  paymentMethod?: 'cod' | 'vnpay';
  shippingFee?: number;
  items: { productId: number; qty: number; size: string }[];
};

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private baseUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  createOrder(payload: CreateOrderPayload): Observable<any>{
    return this.http.post(`${this.baseUrl}/orders`, payload, { headers: this.authHeaders() });
  }

  getOrderByCode(orderCode: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/orders/${orderCode}`, { headers: this.authHeaders() });
  }

  private authHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }
}
