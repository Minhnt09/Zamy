import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { ProductService } from '../services/product.service';

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NavbarComponent, FooterComponent],
  templateUrl: './search-results.component.html',
  styleUrl: './search-results.component.scss'
})
export class SearchResultsComponent implements OnInit {
  keyword = '';
  products: any[] = [];
  filteredProducts: any[] = [];
  loading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService
  ) {}

  ngOnInit() {
    this.route.queryParamMap.subscribe(params => {
      this.keyword = params.get('keyword') ?? '';
      this.applySearch();
    });

    this.loadProducts();
  }

  loadProducts() {
    this.loading = true;

    this.productService.getAllProducts().subscribe({
      next: (data) => {
        this.products = Array.isArray(data) ? data : [];
        this.loading = false;
        this.applySearch();
      },
      error: (error) => {
        console.error('Search results error:', error);
        this.products = [];
        this.filteredProducts = [];
        this.loading = false;
      }
    });
  }

  submitSearch() {
    const keyword = this.keyword.trim();

    if (!keyword) {
      return;
    }

    this.router.navigate(['/search'], {
      queryParams: { keyword }
    });
  }

  applySearch() {
    const searchValue = this.normalize(this.keyword);

    if (!searchValue) {
      this.filteredProducts = [];
      return;
    }

    this.filteredProducts = this.products.filter(product => {
      const searchableText = [
        product.name,
        product.code,
        product.color,
        product.size
      ].map(value => this.normalize(value)).join(' ');

      return searchableText.includes(searchValue);
    });
  }

  private normalize(value: unknown): string {
    return String(value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}
