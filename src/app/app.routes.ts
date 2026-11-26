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
import { FavoritesComponent } from './features/favorites/favorites.component';
import { HighlightProductsComponent } from './shared/components/highlight-products/highlight-products.component';
import { ProductDetailComponent } from './features/product-detail/product-detail.component';
import { CheckoutComponent } from './features/checkout/checkout.component';
import { ReturnPolicyComponent } from './features/return-policy/return-policy.component';
import { PaymentSuccessComponent } from './features/payment-success/payment-success.component';
import { ShippingPolicyComponent } from './features/shipping-policy/shipping-policy.component';
import { SizeGuideComponent } from './features/size-guide/size-guide.component';
import { AdminProductsComponent } from './features/admin/admin-products/admin-products.component';
import { AdminLoginComponent } from './features/admin/admin-login/admin-login.component';
import { adminGuard } from './guards/admin.guard';
import { SearchResultsComponent } from './features/search-results/search-results.component';
import { authGuard } from './guards/auth.guard';
import { CartComponent } from './features/cart/cart.component';

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
    component: AdminProductsComponent,
    canActivate: [adminGuard]
  },
  {
    path: 'admin/login',
    component: AdminLoginComponent
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
    redirectTo: 'favorites',
    pathMatch: 'full'
  },
  {
    path: 'favorites',
    component: FavoritesComponent
  },
  {
    path: 'cart',
    component: CartComponent
  },
  {
    path: 'search',
    component: SearchResultsComponent
  },
  {
    path:'products/:id',
    component: ProductDetailComponent
  },
  {
    path: 'san-pham-noi-bat',
    component: HighlightProductsComponent
  },
  {
    path: 'products-detail',
    redirectTo: 'checkout',
    pathMatch: 'full'
  },
  {
    path: 'checkout',
    component: CheckoutComponent,
    canActivate: [authGuard]
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
