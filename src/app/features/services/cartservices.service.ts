import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService, AuthUser } from './auth.service';

export interface CartItem {
  id: string | number;
  name?: string;
  price?: number;
  qty?: number;
  // thêm trường khác theo app của bạn
}

@Injectable({ providedIn: 'root' })
export class CartservicesService {
  private readonly guestCartKey = 'cart';
  private cart: CartItem[] = [];
  private activeCartKey = this.guestCartKey;
  private activeUserId: number | null = null;

  // BehaviorSubject để đồng bộ toàn app
  private _cart$ = new BehaviorSubject<CartItem[]>([]);
  cart$ = this._cart$.asObservable();

  // Favorites (giữ nguyên logic cũ)
  private favorites: any[] = [];
  private favKey = 'favorites';

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

  // ---------- Persistence ----------
  private loadFromStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const cartJson = localStorage.getItem(this.activeCartKey);
      const favJson = localStorage.getItem(this.favKey);
      this.cart = cartJson ? JSON.parse(cartJson) : [];
      this.favorites = favJson ? JSON.parse(favJson) : [];
    } catch (e) {
      console.warn('Không thể đọc localStorage:', e);
      this.cart = [];
      this.favorites = [];
    }
    this._cart$.next([...this.cart]);
  }

  private saveCartToStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      localStorage.setItem(this.activeCartKey, JSON.stringify(this.cart));
    } catch (e) {
      console.warn('Không thể lưu cart lên localStorage:', e);
    }
    this._cart$.next([...this.cart]); // emit copy to avoid external mutation
  }

  private saveFavoritesToStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      localStorage.setItem(this.favKey, JSON.stringify(this.favorites));
    } catch (e) {
      console.warn('Không thể lưu favorites lên localStorage:', e);
    }
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
      let nextCart: CartItem[] = userCartJson ? JSON.parse(userCartJson) : [];

      if (user && shouldMergeGuestCart) {
        const guestCartJson = localStorage.getItem(this.guestCartKey);
        const guestCart: CartItem[] = guestCartJson ? JSON.parse(guestCartJson) : [];
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

      const idx = merged.findIndex(cartItem => cartItem.id === item.id);
      const qty = item.qty && item.qty > 0 ? item.qty : 1;

      if (idx === -1) {
        merged.push({ ...item, qty });
      } else {
        merged[idx] = {
          ...merged[idx],
          qty: (merged[idx].qty || 1) + qty,
        };
      }
    });

    return merged;
  }

  // ---------- CART API ----------
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
    // trả về copy để tránh thay đổi trực tiếp từ component
    return [...this.cart];
  }

  addToCart(product: CartItem, qty = 1) {
    if (!product || product.id == null) return;
    const idx = this.cart.findIndex(i => i.id === product.id);
    if (idx === -1) {
      const item: CartItem = { ...product, qty: qty };
      this.cart.push(item);
    } else {
      this.cart[idx].qty = (this.cart[idx].qty || 0) + qty;
    }
    this.saveCartToStorage();
  }

  // XÓA theo id (vĩnh viễn + persist)
  removeItemById(id: string | number) {
    const idx = this.cart.findIndex(i => i.id === id);
    if (idx === -1) return false;
    this.cart.splice(idx, 1);
    this.saveCartToStorage();
    return true;
  }

  // XÓA theo index (nếu bạn vẫn muốn)
  removeItemByIndex(index: number) {
    if (index < 0 || index >= this.cart.length) return false;
    this.cart.splice(index, 1);
    this.saveCartToStorage();
    return true;
  }

  updateItemQuantity(id: string | number, qty: number) {
    const idx = this.cart.findIndex(i => i.id === id);
    if (idx === -1) return false;
    if (qty <= 0) {
      this.cart.splice(idx, 1);
    } else {
      this.cart[idx].qty = qty;
    }
    this.saveCartToStorage();
    return true;
  }

  clearCart() {
    this.cart = [];
    this.saveCartToStorage();
  }

  // ---------- FAVORITES (giữ lại, minor fixes) ----------
  addToFavorite(product: any) {
    if (!product || product.id == null) return;
    const exists = this.favorites.find((item: any) => item.id === product.id);
    if (!exists) {
      this.favorites.push(product);
      this.saveFavoritesToStorage();
      console.log('Đã thêm vào danh sách yêu thích:', product);
    } else {
      console.log('Sản phẩm đã có trong danh sách yêu thích');
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
}
