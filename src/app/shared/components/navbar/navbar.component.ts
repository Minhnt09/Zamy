import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { AuthService } from '../../../features/services/auth.service';
import { CartservicesService } from '../../../features/services/cartservices.service';
import { LoginPopupComponent } from '../login-popup/login-popup.component';
import { SearchPopupComponent } from '../search-popup/search-popup.component';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, RouterModule, LoginPopupComponent, SearchPopupComponent],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  readonly cartCount$ = inject(CartservicesService).cart$.pipe(
    map(items => items.reduce((total, item) => total + (item.qty ?? 1), 0)),
  );
  readonly menu = [
    { label: 'Tất cả', path: '/sale' }, { label: 'Đầm', path: '/dress' }, { label: 'Áo', path: '/shirt' },
    { label: 'Quần', path: '/trousers' }, { label: 'Chân váy', path: '/skirt' }, { label: 'Lookbook', path: '/store' },
  ];
  isSearchOpen = false;
  showLogin = false;
  loginNotice = '';
  isMobileMenuOpen = false;
  get currentUser() { return this.auth.getCurrentUser(); }

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
      if (params.get('login') === '1' && !this.currentUser) {
        this.loginNotice = params.get('reason') === 'purchase-required'
          ? 'Đăng nhập hoặc đăng ký để tiếp tục thanh toán.' : '';
        this.showLogin = true;
      }
    });
  }

  closeLogin() {
    this.showLogin = false;
    this.loginNotice = '';
    if (!this.currentUser && this.route.snapshot.queryParamMap.get('login') === '1') {
      const next = this.router.parseUrl(this.router.url);
      for (const key of ['login', 'reason', 'returnUrl']) delete next.queryParams[key];
      void this.router.navigateByUrl(next, { replaceUrl: true });
    }
  }

  logout() { this.auth.logout(); }
}
