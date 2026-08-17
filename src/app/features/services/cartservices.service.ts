import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { AuthService, AuthUser } from './auth.service';
import { environment } from '../../environments/environment';
import { blockingLoadingContext } from '../../core/http/loading-context';

export interface CartItem {
  id: string | number;
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

  private favorites: any[] = [];
  private _favorites$ = new BehaviorSubject<any[]>([]);
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
        this.cart = [];
        this.emitCart();
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

  addToCart(product: CartItem, qty = 1, selectedSize?: string) {
    if (!product || product.id == null) return;
    const size = this.normalizeCartItemSize(product, selectedSize);
    const quantity = Number(qty);
    if (!size || !Number.isInteger(quantity) || quantity <= 0) return;

    if (!this.isLoggedIn()) {
      this.addGuestItem(product, quantity, size);
      return;
    }

    this.http.post<CartApiResponse>(`${this.api}/items`, {
      productId: Number(product.productId ?? product.id), size, quantity,
    }, this.authOptions()).subscribe({
      next: response => this.setDatabaseCart(response.data),
      error: error => console.warn('Không thể thêm sản phẩm vào cart DB:', error),
    });
  }

  removeItem(id: string | number, selectedSize?: string) {
    return this.removeItemById(id, selectedSize);
  }

  removeItemById(id: string | number, selectedSize?: string) {
    const item = this.cart.find(candidate => this.isSameCartItem(candidate, id, selectedSize));
    if (!item) return false;

    if (!this.isLoggedIn()) {
      this.cart = this.cart.filter(candidate => candidate !== item);
      this.saveGuestCart();
      return true;
    }

    if (!item.cartItemId) return false;
    this.http.delete<CartApiResponse>(`${this.api}/items/${item.cartItemId}`, this.authOptions()).subscribe({
      next: response => this.setDatabaseCart(response.data),
      error: error => console.warn('Không thể xoá cart item DB:', error),
    });
    return true;
  }

  removeItemByIndex(index: number) {
    const item = this.cart[index];
    return item ? this.removeItemById(item.id, this.normalizeCartItemSize(item)) : false;
  }

  updateItemQuantity(id: string | number, selectedSize: string | number, qty?: number) {
    const nextQty = qty ?? Number(selectedSize);
    const itemSize = qty === undefined ? undefined : String(selectedSize);
    const item = this.cart.find(candidate => this.isSameCartItem(candidate, id, itemSize));
    if (!item) return false;

    if (nextQty <= 0) return this.removeItemById(id, itemSize);
    if (!Number.isInteger(nextQty)) return false;

    if (!this.isLoggedIn()) {
      item.qty = nextQty;
      this.saveGuestCart();
      return true;
    }

    if (!item.cartItemId) return false;
    this.http.patch<CartApiResponse>(`${this.api}/items/${item.cartItemId}`, { quantity: nextQty }, this.authOptions()).subscribe({
      next: response => this.setDatabaseCart(response.data),
      error: error => console.warn('Không thể cập nhật cart item DB:', error),
    });
    return true;
  }

  clearCart() {
    if (!this.isLoggedIn()) {
      this.cart = [];
      this.saveGuestCart();
      return;
    }

    this.http.delete<CartApiResponse>(this.api, this.authOptions()).subscribe({
      next: response => this.setDatabaseCart(response.data),
      error: error => console.warn('Không thể xoá cart DB:', error),
    });
  }

  addToFavorite(product: any) {
    if (!product || product.id == null) return;
    if (!this.favorites.some((item: any) => item.id === product.id)) {
      this.favorites.push(product);
      this.saveFavoritesToStorage();
    }
  }

  getFavorites(): any[] {
    return [...this.favorites];
  }

  removeFromFavorite(productId: any) {
    this.favorites = this.favorites.filter((item: any) => item.id !== productId);
    this.saveFavoritesToStorage();
  }

  private mergeGuestCartIntoUserCart() {
    const guestItems = this.readGuestCart();
    const payload = {
      items: guestItems.map(item => ({
        productId: Number(item.productId ?? item.id),
        size: this.normalizeCartItemSize(item),
        quantity: Number(item.qty || 1),
      })),
    };

    this.http.post<CartApiResponse>(`${this.api}/merge`, payload, this.authOptions()).subscribe({
      next: response => {
        this.setDatabaseCart(response.data);
        this.removeGuestCart();
        if (response.skipped?.length) console.warn('Một số item guest cart không được merge:', response.skipped);
      },
      error: error => {
        console.warn('Không thể merge guest cart; giữ lại localStorage để thử lại:', error);
        this.loadDatabaseCart();
      },
    });
  }

  private loadDatabaseCart() {
    if (!this.isLoggedIn()) return;
    this.http.get<CartApiResponse>(this.api, this.authOptions()).subscribe({
      next: response => this.setDatabaseCart(response.data),
      error: error => console.warn('Không thể tải cart DB:', error),
    });
  }

  private setDatabaseCart(cart: { items: CartApiItem[] }) {
    this.cart = cart.items.map(item => ({
      id: item.productId,
      productId: item.productId,
      cartItemId: item.id,
      name: item.name,
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
      this.favorites = rawFavorites ? JSON.parse(rawFavorites) : [];
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
