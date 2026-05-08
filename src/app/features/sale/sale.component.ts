import { Component, OnInit } from '@angular/core';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { RouterModule } from '@angular/router';
import { HighlightProductsComponent } from '../../shared/components/highlight-products/highlight-products.component';
import { ProductService } from '../services/product.service';

@Component({
  selector: 'app-sale',
  standalone: true,
  imports: [
    NavbarComponent,
    CommonModule,
    FooterComponent,
    RouterModule,
    HighlightProductsComponent,
  ],
  templateUrl: './sale.component.html',
  styleUrl: './sale.component.scss'
})
export class SaleComponent implements OnInit {
  showColor = false;
  showSize = false;
  showForm = false;

  products: any[] = [];
  filteredProducts: any[] = [];

  maxPrice = 5000000;
  selectedPrice = 5000000;
  sortOption = 'newest';

  selectedColors: string[] = [];
  selectedSizes: string[] = [];

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    this.productService.getAllProducts().subscribe({
      next: (data: any[]) => {
        this.products = Array.isArray(data) ? data : [];
        this.filteredProducts = [...this.products];

        if (this.products.length > 0) {
          this.maxPrice = Math.max(...this.products.map(item => item.price || 0));
          this.selectedPrice = this.maxPrice;
        }
      },
      error: (error) => {
        console.error('Lỗi khi lấy sản phẩm:', error);
      }
    });
  }

  togglePanel(panel: 'color' | 'size' | 'form') {
    if (panel === 'color') this.showColor = !this.showColor;
    if (panel === 'size') this.showSize = !this.showSize;
    if (panel === 'form') this.showForm = !this.showForm;
  }

  toggleColor(color: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;

    if (checked) {
      if (!this.selectedColors.includes(color)) {
        this.selectedColors.push(color);
      }
    } else {
      this.selectedColors = this.selectedColors.filter(item => item !== color);
    }

    this.applyFilters();
  }

  toggleSize(size: string) {
    if (this.selectedSizes.includes(size)) {
      this.selectedSizes = this.selectedSizes.filter(item => item !== size);
    } else {
      this.selectedSizes.push(size);
    }

    this.applyFilters();
  }

  isSizeSelected(size: string): boolean {
    return this.selectedSizes.includes(size);
  }

  onPriceChange(event: Event) {
    this.selectedPrice = +(event.target as HTMLInputElement).value;
    this.applyFilters();
  }

  onSortChange(event: Event) {
    this.sortOption = (event.target as HTMLSelectElement).value;
    this.applyFilters();
  }

  applyFilters() {
    let result = [...this.products];

    if (this.selectedColors.length > 0) {
      result = result.filter(product =>
        this.selectedColors.includes(product.color)
      );
    }

    if (this.selectedSizes.length > 0) {
      result = result.filter(product =>
        this.selectedSizes.includes(product.size)
      );
    }

    result = result.filter(product => (product.price || 0) <= this.selectedPrice);

    if (this.sortOption === 'priceAsc') {
      result.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (this.sortOption === 'priceDesc') {
      result.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else {
      result.sort((a, b) => (b.id || 0) - (a.id || 0));
    }

    this.filteredProducts = result;
  }

  resetFilters() {
    this.selectedColors = [];
    this.selectedSizes = [];
    this.selectedPrice = this.maxPrice;
    this.sortOption = 'newest';
    this.filteredProducts = [...this.products];
  }
}