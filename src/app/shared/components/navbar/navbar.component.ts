import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { map, Observable } from 'rxjs';
import { AuthService, AuthUser } from '../../../features/services/auth.service';
import { CartservicesService } from '../../../features/services/cartservices.service';
import { LoginPopupComponent } from '../login-popup/login-popup.component';
import { SearchPopupComponent } from '../search-popup/search-popup.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LoginPopupComponent,
    SearchPopupComponent
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  isMenuOpen = false;
  isMobileMenuOpen = false;
  showLogin = false;
  isSearchOpen = false;
  loginNotice = '';
  favoriteCount$: Observable<any[]>;
  cartCount$: Observable<number>;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    public authService: AuthService,
    private cartService: CartservicesService
  ) {
    this.favoriteCount$ = this.cartService.favorites$;
    this.cartCount$ = this.cartService.cart$.pipe(
      map(items => items.reduce((total, item) => total + (Number(item.qty) || 1), 0))
    );
    this.authService.loadCurrentUser();
  }

  ngOnInit() {
    this.route.queryParamMap.subscribe(params => {
      if (params.get('login') === '1' && !this.currentUser) {
        this.loginNotice = params.get('reason') === 'purchase-required'
          ? 'Vui lòng đăng nhập hoặc đăng ký để mua hàng.'
          : '';
        this.showLogin = true;
      }
    });
  }

  get currentUser(): AuthUser | null {
    return this.authService.getCurrentUser();
  }

  openSearch() {
    this.isSearchOpen = true;
  }

  closeSearch() {
    this.isSearchOpen = false;
  }

  openLogin() {
    this.loginNotice = '';
    this.showLogin = true;
  }

  closeLogin() {
    this.showLogin = false;
    this.loginNotice = '';

    if (!this.currentUser && this.route.snapshot.queryParamMap.get('login') === '1') {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { login: null, reason: null, returnUrl: null },
        queryParamsHandling: 'merge',
      });
    }
  }

  goHome() {
    this.router.navigate(['/home']);
  }

  goSale() {
    this.router.navigate(['/sale']);
  }

  goDress() {
    this.router.navigate(['/dress']);
  }

  goTrousers() {
    this.router.navigate(['/trousers']);
  }

  goShirt() {
    this.router.navigate(['/shirt']);
  }

  goSkirt() {
    this.router.navigate(['/skirt']);
  }

  goStore() {
    this.router.navigate(['/store']);
  }

  goFavorite() {
    this.router.navigate(['/favorites']);
  }

  goCart() {
    this.router.navigate(['/cart']);
  }

  logout() {
    this.authService.logout();
    this.showLogin = false;
    this.isMobileMenuOpen = false;
  }

  toggleMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }
}
