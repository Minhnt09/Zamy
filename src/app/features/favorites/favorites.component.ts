import { Component, OnInit } from '@angular/core';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { CartservicesService } from '../services/cartservices.service';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [NavbarComponent, FooterComponent, CommonModule],
  templateUrl: './favorites.component.html',
  styleUrls: ['./favorites.component.scss']
})
export class FavoritesComponent implements OnInit {
  favorites: any[] = [];

  constructor(
    private cartService: CartservicesService,
    private notification: NotificationService
  ) {}

  ngOnInit() {
    this.loadFavorites();
  }

  private loadFavorites() {
    this.favorites = this.cartService.getFavorites() || [];
    // nếu muốn debug:
    console.log('Danh sách yêu thích:', this.favorites);
  }

  removeFavorite(productId: any) {
    this.cartService.removeFromFavorite(productId);
    // reload lại danh sách hiển thị
    this.loadFavorites();
  }

  addToCartFromFavorite(product: any) {
    if (!product) return;
    const selectedSize = Array.isArray(product.sizes) && product.sizes.length > 0
      ? product.sizes[0]
      : product.size;
    this.cartService.addToCart(product, 1, selectedSize);
    this.notification.success('Đã thêm sản phẩm yêu thích vào giỏ hàng.');
  }
}
