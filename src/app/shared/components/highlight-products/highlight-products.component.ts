import { Component, DestroyRef, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Product, ProductService } from '../../../features/services/product.service';
import { ProductCardComponent } from '../product-card/product-card.component';
import { ProductLoadingStateComponent } from '../product-loading-state/product-loading-state.component';

@Component({
  selector: 'app-highlight-products',
  imports: [RouterLink, ProductCardComponent, ProductLoadingStateComponent],
  templateUrl: './highlight-products.component.html',
})
export class HighlightProductsComponent {
  private readonly products = inject(ProductService);
  private readonly destroyRef = inject(DestroyRef);
  items: Product[] = [];
  loading = true;
  error: string | null = null;

  ngOnInit() { this.load(); }

  load(retry = false) {
    this.loading = true;
    this.error = null;
    const request = retry ? this.products.refreshProducts() : this.products.getAllProducts();
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: products => { this.items = products.slice(0, 4); this.loading = false; },
      error: () => { this.error = 'Không thể tải sản phẩm. Vui lòng thử lại.'; this.loading = false; },
    });
  }
}
