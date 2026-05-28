import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { ProductService } from '../services/product.service';

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NavbarComponent, FooterComponent, PaginationComponent],
  templateUrl: './search-results.component.html',
  styleUrl: './search-results.component.scss'
})
export class SearchResultsComponent implements OnInit {
  keyword = '';
  products: any[] = [];
  filteredProducts: any[] = [];
  loading = false;
  currentPage = 1;
  pageSize = 6;
  readonly pageSizeOptions = [6, 12, 18, 24];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService
  ) {}

  ngOnInit() {
    this.route.queryParamMap.subscribe(params => {
      this.keyword = params.get('keyword') ?? '';
      this.currentPage = Math.max(Number(params.get('page')) || 1, 1);
      this.pageSize = Math.max(Number(params.get('pageSize')) || this.pageSize, 1);
      this.applySearch();
    });

    this.loadProducts();
  }

  get pagedProducts() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredProducts.slice(startIndex, startIndex + this.pageSize);
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
      queryParams: {
        keyword,
        page: 1,
        pageSize: this.pageSize
      }
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

    this.clampCurrentPage();
  }

  onPageChange(page: number) {
    this.navigateWithPagination(page, this.pageSize);
  }

  onPageSizeChange(pageSize: number) {
    this.navigateWithPagination(1, pageSize);
  }

  private navigateWithPagination(page: number, pageSize: number) {
    this.router.navigate(['/search'], {
      queryParams: {
        keyword: this.keyword.trim(),
        page,
        pageSize
      }
    });

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  private clampCurrentPage() {
    const totalPages = Math.max(1, Math.ceil(this.filteredProducts.length / this.pageSize));

    if (this.currentPage > totalPages) {
      this.currentPage = totalPages;
    }
  }

  private normalize(value: unknown): string {
    return String(value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}
