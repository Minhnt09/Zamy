import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Product, ProductService } from '../services/product.service';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { ProductLoadingStateComponent } from '../../shared/components/product-loading-state/product-loading-state.component';

const PAGE_SIZE = 12;
const collator = new Intl.Collator('vi', { sensitivity: 'base' });
export const normalizeSearch = (value: string) => value.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').trim();

@Component({
  selector: 'app-catalog',
  imports: [CommonModule, RouterLink, ProductCardComponent, ProductLoadingStateComponent],
  templateUrl: './catalog.component.html',
})
export class CatalogComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly products = inject(ProductService);
  private readonly destroyRef = inject(DestroyRef);

  title = '';
  category = '';
  isSearch = false;
  loading = true;
  error = '';
  all: Product[] = [];
  results: Product[] = [];
  pageItems: Product[] = [];
  colors: string[] = [];
  sizes: string[] = [];
  keyword = '';
  color = '';
  size = '';
  max = 0;
  sort = '';
  page = 1;
  pageCount = 1;
  currentPage = 1;
  maxOptions = [300000, 500000, 700000, 1000000, 2000000];

  ngOnInit() {
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(data => {
      this.category = data['category'] ?? '';
      this.title = data['heading'];
      this.isSearch = data['search'] === true;
      this.apply();
    });
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.keyword = params.get('keyword')?.trim() ?? '';
      this.color = params.get('color') ?? '';
      this.size = params.get('size') ?? '';
      this.max = Math.max(0, Number(params.get('max')) || 0);
      this.sort = params.get('sort') ?? '';
      this.page = Math.max(1, Math.trunc(Number(params.get('page')) || 1));
      this.apply();
    });
    this.load();
  }

  load(retry = false) {
    this.loading = true;
    this.error = '';
    const request = retry ? this.products.refreshProducts() : this.products.getAllProducts();
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: products => { this.all = products; this.loading = false; this.apply(); },
      error: () => { this.error = 'Không thể tải sản phẩm. Vui lòng thử lại.'; this.loading = false; },
    });
  }

  change(key: string, event: Event) {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value.trim();
    void this.router.navigate([], { relativeTo: this.route, queryParams: { [key]: value || null, page: null }, queryParamsHandling: 'merge' });
  }

  private apply() {
    const base = this.category ? this.all.filter(product => product.category === this.category) : this.all;
    this.colors = [...new Set(base.flatMap(product => product.color ? [product.color] : []))].sort(collator.compare);
    this.sizes = [...new Set(base.flatMap(product => product.variants?.map(variant => variant.size) ?? []))];
    const term = normalizeSearch(this.keyword);
    this.results = base.filter(product =>
      (!term || normalizeSearch([product.name, product.code, product.color, ...(product.sizes ?? [])].join(' ')).includes(term))
      && (!this.color || product.color === this.color)
      && (!this.size || product.variants?.some(variant => variant.size === this.size && variant.stock > 0))
      && (!this.max || product.price <= this.max));
    if (this.sort === 'price-asc') this.results.sort((a, b) => a.price - b.price);
    if (this.sort === 'price-desc') this.results.sort((a, b) => b.price - a.price);
    if (this.sort === 'name') this.results.sort((a, b) => collator.compare(a.name, b.name));
    this.pageCount = Math.max(1, Math.ceil(this.results.length / PAGE_SIZE));
    this.currentPage = Math.min(this.page, this.pageCount);
    this.pageItems = this.results.slice((this.currentPage - 1) * PAGE_SIZE, this.currentPage * PAGE_SIZE);
  }
}
