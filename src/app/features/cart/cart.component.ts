import { Component, OnInit, OnDestroy } from '@angular/core';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { CommonModule } from '@angular/common';
import { CartservicesService } from '../services/cartservices.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FooterComponent } from "../../shared/components/footer/footer.component";
import { CheckoutService } from '../services/checkout.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [NavbarComponent, CommonModule, FooterComponent],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss']
})
export class CartComponent implements OnInit, OnDestroy {
  cart: any[] = [];
  product: any;
  selectedProductIds = new Set<string | number>();
  selectedCartItems: any[] = [];
  private sub?: Subscription;

  constructor(
    private cartService: CartservicesService,
    private checkoutService: CheckoutService,
    private router: Router
  ) { }

  ngOnInit() {
    // Nếu service có cart$ (BehaviorSubject) thì subscribe để luôn đồng bộ
    const maybeCart$ = (this.cartService as any).cart$;
    if (maybeCart$ && typeof maybeCart$.subscribe === 'function') {
      this.sub = maybeCart$.subscribe((items: any[]) => {
        this.cart = Array.isArray(items) ? items.map(item => {
          if (typeof item.qty !== 'number' || item.qty < 1) item.qty = 1;
          return item;
        }) : [];
        this.syncSelectedProducts();
      });
    } else {
      // fallback: lấy một lần từ getCartItems()
      this.cart = this.cartService.getCartItems() || [];
      this.cart.forEach(item => {
        if (typeof item.qty !== 'number' || item.qty < 1) item.qty = 1;
      });
      this.syncSelectedProducts();
    }
    console.log(this.cart);
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  goBack() {
      this.router.navigate(['/home']);
  }

  goBuy(){
    const selectedItems = this.selectedCartItems;

    if (selectedItems.length === 0) {
      alert('Vui lòng chọn sản phẩm cần đặt hàng');
      return;
    }

    this.checkoutService.setProducts(selectedItems);
    this.router.navigate(['/checkout']);
  }

  isSelected(product: any) {
    return product?.id != null && this.selectedProductIds.has(product.id);
  }

  isAllSelected() {
    return this.cart.length > 0 && this.cart.every(item => this.isSelected(item));
  }

  toggleProduct(product: any, event: Event) {
    if (!product || product.id == null) return;

    const checked = (event.target as HTMLInputElement).checked;

    if (checked) {
      this.selectedProductIds.add(product.id);
    } else {
      this.selectedProductIds.delete(product.id);
    }

    this.updateSelectedCartItems();
  }

  toggleAll(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;

    if (checked) {
      this.cart.forEach(item => {
        if (item?.id != null) {
          this.selectedProductIds.add(item.id);
        }
      });
      this.updateSelectedCartItems();
      return;
    }

    this.selectedProductIds.clear();
    this.updateSelectedCartItems();
  }

  /**
   * Removes an item at index i from cart.
   * Prefer calling service methods first (so service persists + emits).
   * Only mutate local cart as fallback when service offers no API.
   */
  removeItem(index: number) {
    if (index < 0 || index >= this.cart.length) return;
    const item = this.cart[index];
    if (item?.id != null) {
      this.selectedProductIds.delete(item.id);
    }
    const svc: any = this.cartService as any;

    // 1) Prefer id-based removal if item has id and service supports it
    if (item && item.id != null) {
      if (typeof svc.removeItemById === 'function') {
        try {
          svc.removeItemById(item.id);
          return;
        } catch (e) {
          // ignore and try next
        }
      }
      // older naming possibilities
      if (typeof svc.removeItem === 'function') {
        try { svc.removeItem(item.id ?? item); return; } catch {}
      }
      if (typeof svc.removeCartItem === 'function') {
        try { svc.removeCartItem(item.id ?? item); return; } catch {}
      }
    }

    // 2) Try index-based removal on service
    if (typeof svc.removeItemByIndex === 'function') {
      try { svc.removeItemByIndex(index); return; } catch {}
    }

    // 3) As a last resort, try to set whole cart via API (component builds new array without the item)
    if (typeof svc.setCartItems === 'function') {
      try {
        const newCart = this.cart.slice();
        newCart.splice(index, 1); // create new array then pass to service
        svc.setCartItems(newCart);
        return;
      } catch {}
    }

    // 4) Fallback: mutate local and try persist via persistCart()
    // (We avoid mutating before calling service in earlier steps; this is only fallback.)
    this.cart.splice(index, 1);
    this.persistCart();
  }

  /**
   * Change quantity for item at index by delta (+1 or -1).
   * Prefer calling service.updateItemQuantity(id, qty) if available.
   */
  changeQuantity(index: number, delta: number) {
    if (index < 0 || index >= this.cart.length) return;
    const item = this.cart[index];
    const currentQty = (item.qty && item.qty > 0) ? item.qty : 1;
    const newQty = currentQty + delta;
    if (newQty < 1) {
      // if decreasing below 1, treat as remove
      this.removeItem(index);
      return;
    }

    const svc: any = this.cartService as any;
    if (item && item.id != null && typeof svc.updateItemQuantity === 'function') {
      try {
        svc.updateItemQuantity(item.id, newQty);
        return;
      } catch {}
    }

    // fallback: if service exposes generic updateCart/setCartItems, rebuild and persist
    if (typeof svc.setCartItems === 'function') {
      const newCart = this.cart.map((it, idx) => idx === index ? { ...it, qty: newQty } : it);
      try {
        svc.setCartItems(newCart);
        return;
      } catch {}
    }

    // last fallback: update local copy and persist
    this.cart[index] = { ...item, qty: newQty };
    this.persistCart();
  }

  /**
   * Compute total (considering qty)
   */
  getTotalPrice() {
    return this.selectedCartItems.reduce((sum: number, item: any) => {
      const qty = item.qty && item.qty > 0 ? item.qty : 1;
      const price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
      return sum + price * qty;
    }, 0);
  }

  private syncSelectedProducts() {
    const availableIds = new Set(this.cart.map(item => item?.id).filter(id => id != null));

    this.selectedProductIds.forEach(id => {
      if (!availableIds.has(id)) {
        this.selectedProductIds.delete(id);
      }
    });

    this.updateSelectedCartItems();
  }

  private updateSelectedCartItems() {
    this.selectedCartItems = this.cart.filter(item => this.isSelected(item));
  }

  /**
   * Persist cart to service if the service provides a setter/save function.
   * Tries common function names; otherwise tries to assign svc.cart = this.cart.
   */
  private persistCart() {
    const svc: any = this.cartService as any;
    const candidateFns = ['setCartItems', 'saveCart', 'updateCart', 'setCart', 'persistCart', 'setItems'];
    for (const fn of candidateFns) {
      if (typeof svc[fn] === 'function') {
        try {
          svc[fn](this.cart);
          return;
        } catch (e) {
          // ignore and try next
        }
      }
    }

    // fallback: if the service stores cart in a property, try to set it
    try {
      if ('cart' in svc) {
        svc.cart = this.cart;
        // if service provides a public save method name we didn't detect, try to call it:
        if (typeof svc.save === 'function') {
          try { svc.save(); } catch {}
        }
      }
    } catch {}
  }
}
