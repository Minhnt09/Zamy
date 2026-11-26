import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { finalize, Observable } from 'rxjs';
import { CartItem, CartservicesService } from '../services/cartservices.service';
import { CheckoutService } from '../services/checkout.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-cart',
  imports: [CommonModule, RouterLink],
  templateUrl: './cart.component.html',
})
export class CartComponent {
  private readonly cartService = inject(CartservicesService);
  private readonly checkout = inject(CheckoutService);
  private readonly router = inject(Router);
  private readonly notification = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly selection = new Set<string>();
  cart: CartItem[] = [];
  selectedCartItems: CartItem[] = [];
  updating = false;

  constructor() {
    this.cartService.cart$.pipe(takeUntilDestroyed()).subscribe(items => {
      this.cart = items;
      const keys = new Set(items.map(item => this.key(item)));
      this.selection.forEach(key => { if (!keys.has(key)) this.selection.delete(key); });
      this.syncSelection();
    });
  }

  key(item: CartItem) { return item.id + ':' + (item.selectedSize || item.size); }
  isSelected(item: CartItem) { return this.selection.has(this.key(item)); }
  get total() { return this.selectedCartItems.reduce((sum, item) => sum + (item.price ?? 0) * (item.qty ?? 1), 0); }

  toggle(item: CartItem, event: Event) {
    if ((event.target as HTMLInputElement).checked) this.selection.add(this.key(item));
    else this.selection.delete(this.key(item));
    this.syncSelection();
  }

  toggleAll(event: Event) {
    this.selection.clear();
    if ((event.target as HTMLInputElement).checked) this.cart.forEach(item => this.selection.add(this.key(item)));
    this.syncSelection();
  }

  changeQuantity(item: CartItem, delta: number) {
    this.run(this.cartService.updateItemQuantity(item, (item.qty ?? 1) + delta));
  }

  remove(item: CartItem) {
    this.run(this.cartService.removeItem(item));
  }

  goBuy() {
    if (this.updating || !this.selectedCartItems.length) return;
    this.checkout.setProducts(this.selectedCartItems);
    void this.router.navigate(['/checkout']);
  }

  private syncSelection() {
    this.selectedCartItems = this.cart.filter(item => this.isSelected(item));
  }

  private run(operation: Observable<void>) {
    if (this.updating) return;
    this.updating = true;
    operation.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => { this.updating = false; })).subscribe({
      error: error => this.notification.error(error?.error?.error || error?.message || 'Không thể cập nhật giỏ hàng.'),
    });
  }
}
