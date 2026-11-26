import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartservicesService } from '../services/cartservices.service';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';

@Component({
  selector: 'app-favorites',
  imports: [CommonModule, RouterLink, ProductCardComponent],
  templateUrl: './favorites.component.html',
})
export class FavoritesComponent {
  private readonly cart = inject(CartservicesService);
  readonly favorites$ = this.cart.favorites$;
  removeFavorite(id: number) { this.cart.removeFromFavorite(id); }
}
