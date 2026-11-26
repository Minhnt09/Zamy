import { Component, ElementRef, ViewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProductService } from '../../../features/services/product.service';

@Component({
  selector: 'app-highlight-products',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './highlight-products.component.html',
  styleUrl: './highlight-products.component.scss'
})
export class HighlightProductsComponent {
  product: any[] = [];
  loading = true;
  errorMessage: string | null = null;

  constructor(private productService: ProductService) {}
  ngOnInit() { this.loadProducts(); }

  loadProducts(): void {
    this.loading = true;
    this.errorMessage = null;
    this.productService.getAllProducts().subscribe({
      next: (data) => {
        this.product = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Lỗi khi lấy sản phẩm:', error);
        this.errorMessage = this.messageFor(error);
        this.loading = false;
      }
    });
  }

  retry(): void { this.productService.invalidateProducts(); this.loadProducts(); }

  private messageFor(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.error?.code === 'OFFLINE') return 'Bạn đang ngoại tuyến. Vui lòng kiểm tra kết nối mạng.';
    return 'Không thể tải sản phẩm. Vui lòng thử lại.';
  }
  @ViewChild('carousel') carousel?: ElementRef<HTMLElement>;

  scrollLeft() {
    this.scrollCarousel(-1);
  }

  scrollRight() {
    this.scrollCarousel(1);
  }

  private scrollCarousel(direction: 1 | -1): void {
    const carousel = this.carousel?.nativeElement;
    if (!carousel) return;

    carousel.scrollBy({
      left: direction * carousel.clientWidth * 0.8,
      behavior: 'smooth'
    });
  }
}
