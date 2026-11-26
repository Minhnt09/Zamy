import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HighlightProductsComponent } from '../../shared/components/highlight-products/highlight-products.component';

@Component({
  selector: 'app-home',
  imports: [RouterLink, HighlightProductsComponent],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  readonly categories = [
    { name: 'Đầm', path: '/dress' },
    { name: 'Áo', path: '/shirt' },
    { name: 'Quần', path: '/trousers' },
    { name: 'Chân váy', path: '/skirt' },
  ];
}
