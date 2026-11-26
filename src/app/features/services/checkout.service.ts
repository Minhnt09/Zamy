import { Injectable } from '@angular/core';
import { CartItem } from './cartservices.service';

const DRAFT_KEY = 'zamy:checkout-draft';

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private products?: CartItem[];

  setProducts(products: CartItem[]) {
    this.products = products.map(({ id, name, code, image, price, qty, selectedSize, size }) =>
      ({ id, name, code, image, price, qty, selectedSize, size }));
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(this.products)); } catch { /* In-memory fallback. */ }
  }

  getProducts(): CartItem[] {
    if (this.products) return this.products;
    try {
      const stored: unknown = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? '[]');
      if (Array.isArray(stored)) {
        return stored.filter((item): item is CartItem => item !== null && typeof item === 'object'
          && Number.isSafeInteger(Number(item.id)) && Number(item.id) > 0
          && typeof (item.selectedSize || item.size) === 'string'
          && Number.isSafeInteger(item.qty ?? 1) && (item.qty ?? 1) > 0);
      }
    } catch { /* Invalid or unavailable storage. */ }
    return [];
  }

  clear() {
    this.products = [];
    try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* In-memory fallback. */ }
  }
}
