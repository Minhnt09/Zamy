import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { StoreComponent } from './features/store/store.component';
import { ShirtComponent } from './features/shirt/shirt.component';
import { TrousersComponent } from './features/trousers/trousers.component';
import { SkirtComponent } from './features/skirt/skirt.component';
import { DressComponent } from './features/dress/dress.component';
import { SaleComponent } from './features/sale/sale.component';
import { AboutUsComponent } from './features/about-us/about-us.component';
import { NewsComponent } from './features/news/news.component';
import { FavoriteComponent } from './features/favorite/favorite.component';
import { ProductsComponent } from './features/products/products.component';
import { HighlightProductsComponent } from './shared/components/highlight-products/highlight-products.component';
import { ShoppingCartComponent } from './features/shopping-cart/shopping-cart.component';
import { ProductDetailComponent } from './features/product-detail/product-detail.component';
import { ReturnPolicyComponent } from './features/return-policy/return-policy.component';
import { PaymentSuccessComponent } from './features/payment-success/payment-success.component';
import { ShippingPolicyComponent } from './features/shipping-policy/shipping-policy.component';
import { SizeGuideComponent } from './features/size-guide/size-guide.component';
import { ProductsAdminComponent } from './features/admin/products-admin/products-admin.component';
import { LoginAdminComponent } from './features/admin/login-admin/login-admin.component';
import { adminGuard } from './guards/admin.guard';
import { SearchResultsComponent } from './features/search-results/search-results.component';

export const routes: Routes = [
  {
    path:'',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    component: HomeComponent
  },
  {
    path: 'admin/products',
    component: ProductsAdminComponent,
    canActivate: [adminGuard]
  },
  {
    path: 'admin/login',
    component: LoginAdminComponent
  },
  {
    path: 'sale',
    component: SaleComponent
  },
  {
    path: 'dress',
    component: DressComponent
  },
  {
    path: 'shirt',
    component: ShirtComponent
  },
  {
    path: 'trousers',
    component: TrousersComponent
  },
  {
    path: 'skirt',
    component: SkirtComponent
  },
  {
    path: 'store',
    component: StoreComponent
  },
  {
    path: 'about-us',
    component: AboutUsComponent
  },
  {
    path: 'news',
    component: NewsComponent
  },
  {
    path: 'favorite',
    component: FavoriteComponent
  },
  {
    path: 'cart',
    component: ShoppingCartComponent
  },
  {
    path: 'search',
    component: SearchResultsComponent
  },
  {
    path:'products/:id',
    component: ProductsComponent
  },
  {
    path: 'san-pham-noi-bat',
    component: HighlightProductsComponent
  },
  {
    path: 'products-detail',
    component: ProductDetailComponent
  },
  {
    path: 'return-policy',
    component: ReturnPolicyComponent
  },
  {
    path: 'payment-success',
    component: PaymentSuccessComponent
  },
  {
    path: 'shipping-policy',
    component: ShippingPolicyComponent
  },
  {
    path: 'size-guide',
    component: SizeGuideComponent
  },
];
