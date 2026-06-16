import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ProductService } from '../../../features/services/product.service';

@Component({
  selector: 'app-search-popup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './search-popup.component.html',
  styleUrls: ['./search-popup.component.scss']
})
export class SearchPopupComponent implements OnInit {
  @Input() isSearchOpen = false;
  @Output() closeEvent = new EventEmitter<void>();

  keyword = '';
  products: any[] = [];
  loading = false;

  constructor(
    private productService: ProductService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadProducts();
  }

  get filteredProducts() {
    const searchValue = this.normalize(this.keyword);

    if (!searchValue) {
      return [];
    }

    return this.products
      .filter(product => {
        const searchableText = [
          product.name,
          product.code,
          product.color,
          product.size,
          ...(Array.isArray(product.sizes) ? product.sizes : [])
        ].map(value => this.normalize(value)).join(' ');

        return searchableText.includes(searchValue);
      })
      .slice(0, 6);
  }

  loadProducts() {
    this.loading = true;

    this.productService.getAllProducts().subscribe({
      next: (data) => {
        this.products = Array.isArray(data) ? data : [];
        this.loading = false;
      },
      error: (error) => {
        console.error('Search products error:', error);
        this.products = [];
        this.loading = false;
      }
    });
  }

  goToProduct(productId: number) {
    this.closeSearch();
    this.router.navigate(['/products', productId]);
  }

  submitSearch() {
    const keyword = this.keyword.trim();

    if (!keyword) {
      return;
    }

    this.closeSearch();
    this.router.navigate(['/search'], {
      queryParams: { keyword }
    });
  }

  closeSearch() {
    this.keyword = '';
    this.closeEvent.emit();
  }

  private normalize(value: unknown): string {
    return String(value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}
