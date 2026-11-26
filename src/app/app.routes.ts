import { Route, Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { StorefrontLayoutComponent } from './shared/components/storefront-layout.component';
import { adminGuard } from './guards/admin.guard';
import { authGuard } from './guards/auth.guard';

function catalog(path: string, heading: string, category?: string, search = false): Route {
  return {
    path, title: heading + ' | Zamy', data: { heading, category, search },
    loadComponent: () => import('./features/catalog/catalog.component').then(module => module.CatalogComponent),
  };
}

export const routes: Routes = [
  {
    path: 'admin/login', title: 'Đăng nhập quản trị | Zamy',
    loadComponent: () => import('./features/admin/admin-login/admin-login.component').then(module => module.AdminLoginComponent),
  },
  {
    path: 'admin/products', title: 'Quản lý sản phẩm | Zamy', canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/admin-products/admin-products.component').then(module => module.AdminProductsComponent),
  },
  {
    path: '', component: StorefrontLayoutComponent, children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: HomeComponent, title: 'Zamy | Thời trang nữ' },
      catalog('sale', 'Tất cả sản phẩm'),
      catalog('dress', 'Đầm', 'dress'),
      catalog('shirt', 'Áo', 'shirt'),
      catalog('trousers', 'Quần', 'trousers'),
      catalog('skirt', 'Chân váy', 'skirt'),
      catalog('search', 'Tìm kiếm', undefined, true),
      {
        path: 'store', title: 'Lookbook | Zamy',
        loadComponent: () => import('./features/store/store.component').then(module => module.StoreComponent),
      },
      {
        path: 'about-us', title: 'Về Zamy',
        loadComponent: () => import('./features/about-us/about-us.component').then(module => module.AboutUsComponent),
      },
      {
        path: 'news', title: 'Tin tức | Zamy',
        loadComponent: () => import('./features/news/news.component').then(module => module.NewsComponent),
      },
      { path: 'favorite', redirectTo: 'favorites', pathMatch: 'full' },
      {
        path: 'favorites', title: 'Yêu thích | Zamy',
        loadComponent: () => import('./features/favorites/favorites.component').then(module => module.FavoritesComponent),
      },
      {
        path: 'cart', title: 'Giỏ hàng | Zamy',
        loadComponent: () => import('./features/cart/cart.component').then(module => module.CartComponent),
      },
      {
        path: 'products/:id', title: 'Sản phẩm | Zamy',
        loadComponent: () => import('./features/product-detail/product-detail.component').then(module => module.ProductDetailComponent),
      },
      {
        path: 'san-pham-noi-bat', title: 'Sản phẩm nổi bật | Zamy',
        loadComponent: () => import('./shared/components/highlight-products/highlight-products.component').then(module => module.HighlightProductsComponent),
      },
      { path: 'products-detail', redirectTo: 'checkout', pathMatch: 'full' },
      {
        path: 'checkout', title: 'Thanh toán | Zamy', canActivate: [authGuard],
        loadComponent: () => import('./features/checkout/checkout.component').then(module => module.CheckoutComponent),
      },
      {
        path: 'return-policy', title: 'Chính sách đổi trả | Zamy',
        loadComponent: () => import('./features/return-policy/return-policy.component').then(module => module.ReturnPolicyComponent),
      },
      {
        path: 'payment-success', title: 'Trạng thái thanh toán | Zamy',
        loadComponent: () => import('./features/payment-success/payment-success.component').then(module => module.PaymentSuccessComponent),
      },
      {
        path: 'shipping-policy', title: 'Chính sách giao hàng | Zamy',
        loadComponent: () => import('./features/shipping-policy/shipping-policy.component').then(module => module.ShippingPolicyComponent),
      },
      {
        path: 'size-guide', title: 'Hướng dẫn chọn size | Zamy',
        loadComponent: () => import('./features/size-guide/size-guide.component').then(module => module.SizeGuideComponent),
      },
      { path: '**', title: 'Không tìm thấy trang | Zamy', loadComponent: () => import('./shared/components/not-found.component').then(module => module.NotFoundComponent) },
    ],
  },
];
