import { Component } from '@angular/core';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { HighlightProductsComponent } from '../../shared/components/highlight-products/highlight-products.component';
import { CommonModule } from '@angular/common';

type LookbookItem = {
  title: string;
  img: string;
  path: string;
};

@Component({
  selector: 'app-store',
  imports: [
    NavbarComponent,
    FooterComponent,
    HighlightProductsComponent,
    CommonModule
  ],
  standalone: true, 
  templateUrl: './store.component.html',
  styleUrl: './store.component.scss'
})
export class StoreComponent {
  // Demo data (bạn thay ảnh/path theo project của bạn)
  lookbooks: LookbookItem[] = [
    {
      title: 'THIÊN THANH COLLECTION',
      img: '/assets/img/sale1.png',
      path: '/lookbook/thien-thanh-1',
    },
    {
      title: 'THIÊN THANH COLLECTION',
      img: '/assets/img/sale2.png',
      path: '/lookbook/thien-thanh-2',
    },
    {
      title: 'THIÊN THANH COLLECTION',
      img: '/assets/img/sale3.png',
      path: '/lookbook/thien-thanh-3',
    },
    {
      title: 'THIÊN THANH COLLECTION',
      img: '/assets/img/sale4.png',
      path: '/lookbook/thien-thanh-4',
    },
    {
      title: 'THIÊN THANH COLLECTION',
      img: '/assets/img/shirt1.png',
      path: '/lookbook/thien-thanh-5',
    },
    {
      title: 'THIÊN THANH COLLECTION',
      img: '/assets/img/shirt2.png',
      path: '/lookbook/thien-thanh-6',
    },
  ];

}
