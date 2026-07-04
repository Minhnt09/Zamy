import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService, AuthUser } from './auth.service';

export interface CartItem {
  id: string | number;
  name?: string;
  price?: number;
  qty?: number;
  color?: string;
  image?: string;
  size?: string;
  sizes?: string[];
  selectedSize?: string;
}

@Injectable({ providedIn: 'root' })
export class CartservicesService {
  private readonly guestCartKey = 'cart';
  private cart: CartItem[] = [];
  private activeCartKey = this.guestCartKey;
  private activeUserId: number | null = null;

  private _cart$ = new BehaviorSubject<CartItem[]>([]);
  cart$ = this._cart$.asObservable();

  private favorites: any[] = [];
  private favKey = 'favorites';
  private _favorites$ = new BehaviorSubject<any[]>([]);
  favorites$ = this._favorites$.asObservable();

  constructor(private authService: AuthService) {
    const currentUser = this.authService.getCurrentUser();
    this.activeUserId = currentUser?.id ?? null;
    this.activeCartKey = this.getCartStorageKey(currentUser);
    this.loadFromStorage();

    if (currentUser) {
      this.attachCartToCurrentUser();
    }

    this.authService.currentUser$.subscribe(user => {
      const nextUserId = user?.id ?? null;

      if (nextUserId === this.activeUserId) {
        return;
      }

      const previousUserId = this.activeUserId;
      this.activeUserId = nextUserId;
      this.activeCartKey = this.getCartStorageKey(user);
      this.loadCartForUser(user, previousUserId === null && nextUserId !== null);
    });
  }

  private loadFromStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const cartJson = localStorage.getItem(this.activeCartKey);
      const favJson = localStorage.getItem(this.favKey);
      this.cart = cartJson ? this.normalizeCartItems(JSON.parse(cartJson)) : [];
      this.favorites = favJson ? JSON.parse(favJson) : [];
    } catch (e) {
      console.warn('Khong the doc localStorage:', e);
      this.cart = [];
      this.favorites = [];
    }
    this._cart$.next([...this.cart]);
    this._favorites$.next([...this.favorites]);
  }

  private saveCartToStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      localStorage.setItem(this.activeCartKey, JSON.stringify(this.cart));
    } catch (e) {
      console.warn('Khong the luu cart len localStorage:', e);
    }
    this._cart$.next([...this.cart]);
  }

  private saveFavoritesToStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      localStorage.setItem(this.favKey, JSON.stringify(this.favorites));
    } catch (e) {
      console.warn('Khong the luu favorites len localStorage:', e);
    }
    this._favorites$.next([...this.favorites]);
  }

  private getCartStorageKey(user: AuthUser | null) {
    return user?.id != null ? `cart:user:${user.id}` : this.guestCartKey;
  }

  private loadCartForUser(user: AuthUser | null, shouldMergeGuestCart: boolean) {
    if (typeof window === 'undefined' || !window.localStorage) {
      this.cart = [];
      this._cart$.next([]);
      return;
    }

    try {
      const userCartJson = localStorage.getItem(this.activeCartKey);
      let nextCart: CartItem[] = userCartJson ? this.normalizeCartItems(JSON.parse(userCartJson)) : [];

      if (user && shouldMergeGuestCart) {
        const guestCartJson = localStorage.getItem(this.guestCartKey);
        const guestCart: CartItem[] = guestCartJson ? this.normalizeCartItems(JSON.parse(guestCartJson)) : [];
        nextCart = this.mergeCartItems(nextCart, guestCart);
        localStorage.setItem(this.activeCartKey, JSON.stringify(nextCart));
        localStorage.removeItem(this.guestCartKey);
      }

      this.cart = nextCart;
    } catch (e) {
      console.warn('Unable to read cart from localStorage:', e);
      this.cart = [];
    }

    this._cart$.next([...this.cart]);
  }

  private mergeCartItems(baseCart: CartItem[], incomingCart: CartItem[]) {
    const merged = [...baseCart];

    incomingCart.forEach(item => {
      if (!item || item.id == null) return;

      const selectedSize = this.normalizeCartItemSize(item);
      const idx = merged.findIndex(cartItem => this.isSameCartItem(cartItem, item.id, selectedSize));
      const qty = item.qty && item.qty > 0 ? item.qty : 1;

      if (idx === -1) {
        merged.push({ ...item, selectedSize, size: selectedSize, qty });
      } else {
        merged[idx] = {
          ...merged[idx],
          qty: (merged[idx].qty || 1) + qty,
        };
      }
    });

    return merged;
  }

  attachCartToCurrentUser() {
    const user = this.authService.getCurrentUser();

    if (!user) {
      return;
    }

    this.activeUserId = user.id;
    this.activeCartKey = this.getCartStorageKey(user);
    this.loadCartForUser(user, true);
  }

  getCartItems(): CartItem[] {
    return [...this.cart];
  }

  addToCart(product: CartItem, qty = 1, selectedSize?: string) {
    if (!product || product.id == null) return;

    const itemSize = this.normalizeCartItemSize(product, selectedSize);
    const idx = this.cart.findIndex(i => this.isSameCartItem(i, product.id, itemSize));

    if (idx === -1) {
      this.cart.push({ ...product, selectedSize: itemSize, size: itemSize, qty });
    } else {
      this.cart[idx].qty = (this.cart[idx].qty || 0) + qty;
    }

    this.saveCartToStorage();
  }

  removeItem(id: string | number, selectedSize?: string) {
    return this.removeItemById(id, selectedSize);
  }

  removeItemById(id: string | number, selectedSize?: string) {
    const idx = this.cart.findIndex(i => this.isSameCartItem(i, id, selectedSize));
    if (idx === -1) return false;
    this.cart.splice(idx, 1);
    this.saveCartToStorage();
    return true;
  }

  removeItemByIndex(index: number) {
    if (index < 0 || index >= this.cart.length) return false;
    this.cart.splice(index, 1);
    this.saveCartToStorage();
    return true;
  }

  updateItemQuantity(id: string | number, selectedSize: string | number, qty?: number) {
    const nextQty = qty ?? Number(selectedSize);
    const itemSize = qty === undefined ? undefined : String(selectedSize);
    const idx = this.cart.findIndex(i => this.isSameCartItem(i, id, itemSize));

    if (idx === -1) return false;

    if (nextQty <= 0) {
      this.cart.splice(idx, 1);
    } else {
      this.cart[idx].qty = nextQty;
    }

    this.saveCartToStorage();
    return true;
  }

  clearCart() {
    this.cart = [];
    this.saveCartToStorage();
  }

  addToFavorite(product: any) {
    if (!product || product.id == null) return;
    const exists = this.favorites.find((item: any) => item.id === product.id);
    if (!exists) {
      this.favorites.push(product);
      this.saveFavoritesToStorage();
      console.log('Da them vao danh sach yeu thich:', product);
    } else {
      console.log('San pham da co trong danh sach yeu thich');
    }
  }

  getFavorites(): any[] {
    return [...this.favorites];
  }

  removeFromFavorite(productId: any) {
    const idx = this.favorites.findIndex((i: any) => i.id === productId);
    if (idx !== -1) {
      this.favorites.splice(idx, 1);
      this.saveFavoritesToStorage();
    }
  }

  private normalizeCartItems(items: CartItem[]) {
    if (!Array.isArray(items)) return [];

    return items
      .filter(item => item && item.id != null)
      .map(item => {
        const selectedSize = this.normalizeCartItemSize(item);
        const qty = item.qty && item.qty > 0 ? item.qty : 1;
        return { ...item, selectedSize, size: selectedSize, qty };
      });
  }

  private normalizeCartItemSize(item: CartItem, selectedSize?: string) {
    return String(selectedSize || item.selectedSize || item.size || '').trim();
  }

  private isSameCartItem(item: CartItem, id: string | number, selectedSize?: string) {
    return item.id === id && this.normalizeCartItemSize(item) === String(selectedSize || '').trim();
  }
}
