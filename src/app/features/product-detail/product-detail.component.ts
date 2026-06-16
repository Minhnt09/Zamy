import { Component, ViewChild } from '@angular/core';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { CommonModule } from '@angular/common';
import { ProductService } from '../services/product.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CartservicesService } from '../services/cartservices.service';
import { HighlightProductsComponent } from "../../shared/components/highlight-products/highlight-products.component";
import { CheckoutService } from '../services/checkout.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [NavbarComponent, FooterComponent, CommonModule, HighlightProductsComponent],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.scss'
})
export class ProductDetailComponent {
  product: any = null;
  loading = true;
  quantity = 1;
  selectedSize = '';

  @ViewChild('carousel') carousel: any;

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private cartService: CartservicesService,
    private router: Router,
    private checkoutService: CheckoutService,
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (!id) {
        this.loading = false;
        return;
      }

      this.loading = true;
      this.productService.getProductById(+id).subscribe({
        next: (data) => {
          this.product = data;
          this.quantity = 1;
          this.selectedSize = '';
          this.loading = false;
        },
        error: (error) => {
          console.error('Loi khi lay san pham:', error);
          this.product = null;
          this.loading = false;
        }
      });
    });
  }

  addToCart() {
    if (!this.product) return;
    if (!this.ensureSizeSelected()) return;

    this.cartService.addToCart(this.product, this.quantity, this.selectedSize);
    alert('San pham da duoc them vao gio hang!');
  }

  addToFavorite() {
    if (!this.product) return;
    this.cartService.addToFavorite(this.product);
    alert('Da them vao yeu thich');
  }

  buyNow() {
    if (!this.product) return;
    if (!this.ensureSizeSelected()) return;

    const checkoutItem = {
      ...this.product,
      qty: this.quantity,
      size: this.selectedSize,
      selectedSize: this.selectedSize
    };
    this.checkoutService.setProducts([checkoutItem]);
    this.router.navigate(['/checkout']);
  }

  getProductSizes(product = this.product): string[] {
    if (!product) return [];

    if (Array.isArray(product.sizes) && product.sizes.length > 0) {
      return product.sizes.map((size: any) => String(size).trim()).filter(Boolean);
    }

    return product.size ? [String(product.size).trim()] : [];
  }

  selectSize(size: string) {
    this.selectedSize = size;
  }

  changeQuantity(delta: number) {
    const stock = Number(this.product?.stock) || 0;
    const nextQuantity = this.quantity + delta;
    const maxQuantity = stock > 0 ? stock : nextQuantity;
    this.quantity = Math.min(Math.max(nextQuantity, 1), maxQuantity);
  }

  private ensureSizeSelected() {
    const sizes = this.getProductSizes();

    if (sizes.length === 0) {
      alert('San pham chua co size');
      return false;
    }

    if (!this.selectedSize) {
      alert('Vui lòng chọn size');
      return false;
    }

    return true;
  }

  scrollLeft() {
    this.carousel?.nativeElement?.scrollBy({ left: -200, behavior: 'smooth' });
  }

  scrollRight() {
    this.carousel?.nativeElement?.scrollBy({ left: 200, behavior: 'smooth' });
  }
}
