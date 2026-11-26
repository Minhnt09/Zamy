import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Product, ProductService } from '../../../features/services/product.service';

@Component({
  selector: 'app-search-popup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './search-popup.component.html',
  styleUrls: ['./search-popup.component.scss']
})
export class SearchPopupComponent implements OnInit, AfterViewInit {
  @ViewChild("dialog") private dialog!: ElementRef<HTMLDialogElement>;
  ngAfterViewInit() { this.dialog.nativeElement.showModal(); }
  @Output() closeEvent = new EventEmitter<void>();

  keyword = '';
  products: Product[] = [];
  failed = false;
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
    this.failed = false;

    this.productService.getAllProducts().subscribe({
      next: (data) => {
        this.products = Array.isArray(data) ? data : [];
        this.loading = false;
      },
      error: () => {
        this.failed = true;
        this.products = [];
        this.loading = false;
      }
    });
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
    this.dialog.nativeElement.close();
    this.closeEvent.emit();
  }

  private normalize(value: unknown): string {
    return String(value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .trim();
  }
}
