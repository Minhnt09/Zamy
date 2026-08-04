import { Component, HostListener } from '@angular/core';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { ProductFilterComponent } from '../../shared/components/product-filter/product-filter.component';
import { HighlightProductsComponent } from '../../shared/components/highlight-products/highlight-products.component';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { ProductService } from '../services/product.service';
import { ProductLoadingStateComponent } from '../../shared/components/product-loading-state/product-loading-state.component';

@Component({
  selector: 'app-trousers',
  imports: [NavbarComponent, 
            CommonModule, 
            FooterComponent, 
            ProductFilterComponent, 
            HighlightProductsComponent,
            ProductCardComponent,
            ProductLoadingStateComponent
          ],
  standalone: true,
  templateUrl: './trousers.component.html',
  styleUrl: './trousers.component.scss'
})
export class TrousersComponent {
  product: any[] = [];
  loading = true;
  errorMessage: string | null = null;
  
  constructor(private productService: ProductService) {}
  ngOnInit() { this.loadProducts(); }

  loadProducts() {
    this.loading = this.product.length === 0;
    this.errorMessage = null;
    this.productService.getAllProducts().subscribe({
      next: (data) => {
        this.product = data;
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Không thể tải sản phẩm. Vui lòng thử lại.';
        this.loading = false;
      }
    });
  }

  retry() { this.productService.invalidateProducts(); this.loadProducts(); }
}
