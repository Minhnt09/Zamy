import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { Subject, catchError, distinctUntilChanged, finalize, map, of, startWith, switchMap } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Product, ProductService } from '../services/product.service';
import { CartservicesService } from '../services/cartservices.service';
import { CheckoutService } from '../services/checkout.service';
import { NotificationService } from '../../core/services/notification.service';
import { HighlightProductsComponent } from '../../shared/components/highlight-products/highlight-products.component';
import { ProductImageComponent } from '../../shared/components/product-image/product-image.component';

@Component({
  selector: 'app-product-detail',
  imports: [CommonModule, RouterLink, HighlightProductsComponent, ProductImageComponent],
  templateUrl: './product-detail.component.html',
})
export class ProductDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly products = inject(ProductService);
  private readonly cart = inject(CartservicesService);
  private readonly router = inject(Router);
  private readonly checkout = inject(CheckoutService);
  private readonly notifications = inject(NotificationService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly destroyRef = inject(DestroyRef);
  private readonly reload = new Subject<void>();

  product: Product | null = null;
  loading = true;
  errorMessage = '';
  selectedSize = '';
  quantity = 1;
  adding = false;

  ngOnInit() {
    const description = 'Khám phá đầm, áo, quần và chân váy tại Zamy.';
    this.destroyRef.onDestroy(() => this.meta.updateTag({ name: 'description', content: description }));
    this.route.paramMap.pipe(
      map(params => Number(params.get('id'))),
      distinctUntilChanged(),
      switchMap(id => this.reload.pipe(
        startWith(undefined),
        switchMap(() => {
          this.product = null;
          this.title.setTitle('Sản phẩm | Zamy');
          this.meta.updateTag({ name: 'description', content: description });
          this.selectedSize = '';
          this.quantity = 1;
          this.loading = true;
          this.errorMessage = '';
          if (!Number.isSafeInteger(id) || id <= 0) return of(null);
          return this.products.getProductById(id).pipe(catchError((error: unknown) => {
            if (!(error instanceof HttpErrorResponse) || error.status !== 404) {
              this.errorMessage = 'Không thể tải sản phẩm. Vui lòng thử lại.';
            }
            return of(null);
          }));
        }),
      )),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(product => {
      this.product = product;
      this.loading = false;
      if (product) {
        this.title.setTitle(product.name + ' | Zamy');
        this.meta.updateTag({ name: 'description', content: product.name + (product.color ? ' · ' + product.color : '') + ' tại Zamy.' });
      }
    });
  }

  get stock() { return this.product?.variants?.find(variant => variant.size === this.selectedSize)?.stock ?? 0; }

  retry() { this.reload.next(); }

  selectSize(size: string) {
    this.selectedSize = size;
    this.quantity = Math.max(1, Math.min(this.quantity, this.stock));
  }

  changeQuantity(delta: number) { this.quantity = Math.max(1, Math.min(this.stock, this.quantity + delta)); }

  addToCart() {
    const line = this.selectedLine();
    if (!line || this.adding) return;
    this.adding = true;
    this.cart.addToCart(line, this.quantity, this.selectedSize).pipe(
      finalize(() => { this.adding = false; }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => this.notifications.success('Đã thêm sản phẩm vào giỏ hàng.'),
      error: error => this.notifications.error(error?.error?.error || error?.message || 'Không thể thêm sản phẩm vào giỏ hàng.'),
    });
  }

  addToFavorite() {
    if (!this.product) return;
    this.cart.addToFavorite(this.product);
    this.notifications.success('Đã lưu sản phẩm yêu thích.');
  }

  buyNow() {
    const line = this.selectedLine();
    if (!line || this.adding) return;
    this.checkout.setProducts([line]);
    void this.router.navigate(['/checkout']);
  }

  private selectedLine() {
    if (!this.product || !this.selectedSize || this.quantity > this.stock) {
      this.notifications.warning('Vui lòng chọn kích cỡ còn hàng.');
      return null;
    }
    return { ...this.product, stock: this.stock, qty: this.quantity, selectedSize: this.selectedSize };
  }
}
