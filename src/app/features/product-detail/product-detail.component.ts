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
          this.loading = false;
        },
        error: (error) => {
          console.error('Lỗi khi lấy sản phẩm:', error);
          this.product = null;
          this.loading = false;
        }
      });
    });
  }

  addToCart() {
    if (!this.product) return;
    this.cartService.addToCart(this.product);
    alert('Sản phẩm đã được thêm vào giỏ hàng!');
  }

  addToFavorite() {
    if (!this.product) return;
    this.cartService.addToFavorite(this.product);
    alert('Đã thêm vào yêu thích');
  }

  buyNow() {
    if (!this.product) return;

    const checkoutItem = { ...this.product, qty: 1 };
    this.checkoutService.setProducts([checkoutItem]);
    this.router.navigate(['/checkout']);
  }

  scrollLeft() {
    this.carousel?.nativeElement?.scrollBy({ left: -200, behavior: 'smooth' });
  }

  scrollRight() {
    this.carousel?.nativeElement?.scrollBy({ left: 200, behavior: 'smooth' });
  }
}
