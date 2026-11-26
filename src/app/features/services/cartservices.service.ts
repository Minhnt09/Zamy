import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, defer, map, of, tap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
import { Product } from './product.service';
import { blockingLoadingContext } from '../../core/http/loading-context';

export interface CartItem {
  id: string | number;
  code?: string;
  cartItemId?: number;
  productId?: number;
  name?: string;
  price?: number;
  qty?: number;
  color?: string;
  image?: string;
  size?: string;
  sizes?: string[];
  selectedSize?: string;
  stock?: number;
}

interface CartApiItem {
  id: number;
  productId: number;
  code: string;
  name: string;
  image: string;
  color: string;
  price: number;
  size: string;
  quantity: number;
  stock: number;
}

interface CartApiResponse {
  data: { id: number; items: CartApiItem[] };
  skipped?: { index: number; reason: string }[];
}

@Injectable({ providedIn: 'root' })
export class CartservicesService {
  private readonly guestCartKey = 'cart';
  private readonly favKey = 'favorites';
  private readonly api = `${environment.apiUrl}/cart`;
  private cart: CartItem[] = [];
  private activeUserId: number | null = null;

  private _cart$ = new BehaviorSubject<CartItem[]>([]);
  cart$ = this._cart$.asObservable();

  private favorites: Product[] = [];
  private _favorites$ = new BehaviorSubject<Product[]>([]);
  favorites$ = this._favorites$.asObservable();

  constructor(private authService: AuthService, private http: HttpClient) {
    this.loadGuestCart();
    this.loadFavorites();

    this.authService.currentUser$.subscribe(user => {
      const nextUserId = user?.id ?? null;
      if (nextUserId === this.activeUserId) return;

      this.activeUserId = nextUserId;
      if (user) {
        this.mergeGuestCartIntoUserCart();
      } else {
        this.loadGuestCart();
      }
    });
  }

  attachCartToCurrentUser() {
    const user = this.authService.getCurrentUser();
    if (!user || user.id === this.activeUserId) return;
    this.activeUserId = user.id;
    this.mergeGuestCartIntoUserCart();
  }

  getCartItems(): CartItem[] {
    return [...this.cart];
  }

  addToCart(product: CartItem, qty = 1, selectedSize?: string): Observable<void> {
    return defer(() => {
      const size = this.normalizeCartItemSize(product, selectedSize);
      const productId = Number(product.productId ?? product.id);
      if (!size || !Number.isInteger(productId) || productId <= 0 || !Number.isInteger(qty) || qty <= 0) {
        return throwError(() => new Error('Sản phẩm, kích cỡ hoặc số lượng không hợp lệ.'));
      }
      if (this.isLoggedIn()) {
        return this.mutateCart('POST', '/items', { productId, size, quantity: qty });
      }
      const existing = this.cart.find(item => this.isSameCartItem(item, product.id, size));
      if (product.stock !== undefined && (existing?.qty ?? 0) + qty > product.stock) {
        return throwError(() => new Error('Số lượng vượt quá tồn kho của kích cỡ đã chọn.'));
      }
      this.addGuestItem(product, qty, size);
      return of(undefined);
    });
  }

  removeItem(item: CartItem): Observable<void> {
    return this.updateItemQuantity(item, 0);
  }

  updateItemQuantity(item: CartItem, quantity: number): Observable<void> {
    return defer(() => {
      const current = this.cart.find(candidate => this.isSameCartItem(candidate, item.id, this.normalizeCartItemSize(item)));
      if (!current || !Number.isInteger(quantity) || quantity < 0) {
        return throwError(() => new Error('Không thể cập nhật sản phẩm này.'));
      }
      if (this.isLoggedIn()) {
        if (!current.cartItemId) return throwError(() => new Error('Giỏ hàng đang đồng bộ. Vui lòng thử lại.'));
        const path = '/items/' + current.cartItemId;
        return quantity === 0 ? this.mutateCart('DELETE', path) : this.mutateCart('PATCH', path, { quantity });
      }
      if (current.stock !== undefined && quantity > current.stock) {
        return throwError(() => new Error('Số lượng vượt quá tồn kho của kích cỡ đã chọn.'));
      }
      this.cart = quantity === 0
        ? this.cart.filter(candidate => candidate !== current)
        : this.cart.map(candidate => candidate === current ? { ...candidate, qty: quantity } : candidate);
      this.saveGuestCart();
      return of(undefined);
    });
  }

  private mutateCart(method: string, path: string, body?: object): Observable<void> {
    const token = this.authService.getToken();
    return this.http.request<CartApiResponse>(method, this.api + path, { ...this.authOptions(), body }).pipe(
      tap(response => {
        if (token !== this.authService.getToken()) throw new Error('Phiên mua sắm đã thay đổi. Vui lòng thử lại.');
        this.setDatabaseCart(response.data);
      }),
      map(() => undefined),
    );
  }

  addToFavorite(product: Product) {
    if (!product || product.id == null) return;
    if (!this.favorites.some(item => item.id === product.id)) {
      this.favorites.push(product);
      this.saveFavoritesToStorage();
    }
  }

  getFavorites(): any[] {
    return [...this.favorites];
  }

  removeFromFavorite(productId: number) {
    this.favorites = this.favorites.filter(item => item.id !== productId);
    this.saveFavoritesToStorage();
  }

  private mergeGuestCartIntoUserCart() {
    const token = this.authService.getToken();
    const guestItems = this.readGuestCart();
    if (guestItems.length === 0) {
      this.refreshCart();
      return;
    }
    const payload = {
      items: guestItems.map(item => ({
        productId: Number(item.productId ?? item.id),
        size: this.normalizeCartItemSize(item),
        quantity: Number(item.qty || 1),
      })),
    };

    this.http.post<CartApiResponse>(`${this.api}/merge`, payload, this.authOptions()).subscribe({
      next: response => {
        if (token !== this.authService.getToken()) return;
        this.setDatabaseCart(response.data);
        this.removeGuestCart();
        if (response.skipped?.length) console.warn('Một số item guest cart không được merge:', response.skipped);
      },
      error: error => {
        console.warn('Không thể merge guest cart; giữ lại localStorage để thử lại:', error);
        this.refreshCart();
      },
    });
  }

  refreshCart() {
    if (!this.isLoggedIn()) return;
    const token = this.authService.getToken();
    this.http.get<CartApiResponse>(this.api, this.authOptions()).subscribe({
      next: response => {
        if (token === this.authService.getToken()) this.setDatabaseCart(response.data);
      },
      error: error => console.warn('Không thể tải cart DB:', error),
    });
  }

  private setDatabaseCart(cart: { items: CartApiItem[] }) {
    this.cart = cart.items.map(item => ({
      id: item.productId,
      productId: item.productId,
      cartItemId: item.id,
      name: item.name,
      code: item.code,
      price: item.price,
      color: item.color,
      image: item.image,
      size: item.size,
      selectedSize: item.size,
      qty: item.quantity,
      stock: item.stock,
    }));
    this.emitCart();
  }

  private addGuestItem(product: CartItem, qty: number, size: string) {
    const index = this.cart.findIndex(item => this.isSameCartItem(item, product.id, size));
    if (index === -1) {
      this.cart.push({ ...product, selectedSize: size, size, qty, productId: Number(product.productId ?? product.id) });
    } else {
      this.cart[index].qty = (this.cart[index].qty || 0) + qty;
    }
    this.saveGuestCart();
  }

  private isLoggedIn() {
    return this.activeUserId !== null && !!this.authService.getToken();
  }

  private authOptions() {
    return {
      headers: new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` }),
      context: blockingLoadingContext(),
    };
  }

  private loadGuestCart() {
    this.cart = this.readGuestCart();
    this.emitCart();
  }

  private readGuestCart(): CartItem[] {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
      const rawCart = localStorage.getItem(this.guestCartKey);
      return rawCart ? this.normalizeCartItems(JSON.parse(rawCart)) : [];
    } catch {
      return [];
    }
  }

  private saveGuestCart() {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(this.guestCartKey, JSON.stringify(this.cart));
    }
    this.emitCart();
  }

  private removeGuestCart() {
    if (typeof window !== 'undefined' && window.localStorage) localStorage.removeItem(this.guestCartKey);
  }

  private loadFavorites() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const rawFavorites = localStorage.getItem(this.favKey);
      const parsed: unknown = rawFavorites ? JSON.parse(rawFavorites) : [];
      this.favorites = Array.isArray(parsed) ? parsed
        .filter(item => item && typeof item.image === 'string' && typeof item.price === 'number'
          && Number.isSafeInteger(Number(item.id)) && typeof (item.name || item.title) === 'string')
        .map(item => ({ ...item, id: Number(item.id), name: item.name || item.title })) : [];
    } catch {
      this.favorites = [];
    }
    this._favorites$.next([...this.favorites]);
  }

  private saveFavoritesToStorage() {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(this.favKey, JSON.stringify(this.favorites));
    }
    this._favorites$.next([...this.favorites]);
  }

  private emitCart() {
    this._cart$.next([...this.cart]);
  }

  private normalizeCartItems(items: CartItem[]) {
    if (!Array.isArray(items)) return [];
    return items.filter(item => item && item.id != null).map(item => {
      const selectedSize = this.normalizeCartItemSize(item);
      const qty = Number(item.qty);
      return { ...item, selectedSize, size: selectedSize, qty: Number.isInteger(qty) && qty > 0 ? qty : 1 };
    });
  }

  private normalizeCartItemSize(item: CartItem, selectedSize?: string) {
    return String(selectedSize || item.selectedSize || item.size || '').trim().toUpperCase();
  }

  private isSameCartItem(item: CartItem, id: string | number, selectedSize?: string) {
    return Number(item.id) === Number(id) && this.normalizeCartItemSize(item) === String(selectedSize || '').trim().toUpperCase();
  }
}
