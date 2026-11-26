import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, defer, switchMap, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { blockingLoadingContext } from '../../core/http/loading-context';

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

export interface OrderStatusResponse {
  data: { orderCode: string; status: string; payment: { provider: string; status: string } | null };
}

export interface CreateOrderResponse {
  data: { orderCode: string; payment: { provider: 'cod' | 'vnpay'; status: string } | null };
  paymentUrl?: string;
  paymentWarning?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private baseUrl = environment.apiUrl;
  private readonly checkoutKeys = new Map<string, string>();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  createOrder(payload: CreateOrderPayload): Observable<CreateOrderResponse> {
    const headers = this.authHeaders();
    return defer(() => this.checkoutStorageKey(payload)).pipe(
      switchMap((storageKey) => this.http.post<CreateOrderResponse>(`${this.baseUrl}/orders`, payload, {
        headers: headers.set('Idempotency-Key', this.getCheckoutKey(storageKey)),
        context: blockingLoadingContext()
      }).pipe(tap({
        next: () => this.clearCheckoutKey(storageKey),
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && [400, 401, 403, 404, 409, 422].includes(error.status)) {
            this.clearCheckoutKey(storageKey);
          }
        },
      })))
    );
  }

  async hasPendingCheckout(payload: CreateOrderPayload): Promise<boolean> {
    const key = await this.checkoutStorageKey(payload);
    if (this.checkoutKeys.has(key)) return true;
    try { return sessionStorage.getItem(key) !== null; } catch { return false; }
  }

  private async checkoutStorageKey(payload: CreateOrderPayload): Promise<string> {
    const request = JSON.stringify([this.authService.getCurrentUser()?.id, payload]);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(request));
    const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `zamy:checkout:${hash}`;
  }

  private getCheckoutKey(storageKey: string): string {
    const cached = this.checkoutKeys.get(storageKey);
    if (cached) return cached;
    let key: string = crypto.randomUUID();
    try {
      key = sessionStorage.getItem(storageKey) || key;
      sessionStorage.setItem(storageKey, key);
    } catch {
      // In-memory keys still protect retries when session storage is unavailable.
    }
    this.checkoutKeys.set(storageKey, key);
    return key;
  }

  private clearCheckoutKey(storageKey: string): void {
    this.checkoutKeys.delete(storageKey);
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      // Session storage is optional.
    }
  }

  getOrderByCode(orderCode: string): Observable<OrderStatusResponse> {
    return this.http.get<OrderStatusResponse>(`${this.baseUrl}/orders/${encodeURIComponent(orderCode)}`, { headers: this.authHeaders() });
  }

  private authHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }
}
