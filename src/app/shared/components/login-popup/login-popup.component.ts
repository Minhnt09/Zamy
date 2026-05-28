import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../features/services/auth.service';
import { CartservicesService } from '../../../features/services/cartservices.service';

type AuthMode = 'login' | 'register';

@Component({
  selector: 'app-login-popup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login-popup.component.html',
  styleUrl: './login-popup.component.scss'
})
export class LoginPopupComponent {
  @Output() closePopup = new EventEmitter<void>();

  mode: AuthMode = 'login';
  showPassword = false;
  loading = false;
  errorMessage = '';
  successMessage = '';

  loginForm = {
    email: '',
    password: ''
  };

  registerForm = {
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  };

  constructor(
    private authService: AuthService,
    private cartService: CartservicesService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  get isLoginMode() {
    return this.mode === 'login';
  }

  switchMode(mode: AuthMode) {
    this.mode = mode;
    this.errorMessage = '';
    this.successMessage = '';
    this.showPassword = false;
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  submit() {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.isLoginMode) {
      this.login();
    } else {
      this.register();
    }
  }

  login() {
    const email = this.loginForm.email.trim();
    const password = this.loginForm.password;

    if (!email || !password) {
      this.errorMessage = 'Vui lòng nhập email và mật khẩu';
      return;
    }

    this.loading = true;

    this.authService.login({ email, password }).subscribe({
      next: () => {
        this.cartService.attachCartToCurrentUser();
        this.loading = false;
        this.successMessage = 'Đăng nhập thành công';
        setTimeout(() => this.handleAuthSuccess(), 500);
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error.error?.error || 'Đăng nhập thất bại';
      }
    });
  }

  register() {
    const name = this.registerForm.name.trim();
    const email = this.registerForm.email.trim();
    const password = this.registerForm.password;
    const confirmPassword = this.registerForm.confirmPassword;

    if (!name || !email || !password || !confirmPassword) {
      this.errorMessage = 'Vui lòng nhập đầy đủ thông tin';
      return;
    }

    if (password.length < 6) {
      this.errorMessage = 'Mật khẩu phải có ít nhất 6 ký tự';
      return;
    }

    if (password !== confirmPassword) {
      this.errorMessage = 'Mật khẩu xác nhận không khớp';
      return;
    }

    this.loading = true;

    this.authService.register({ name, email, password }).subscribe({
      next: () => {
        this.cartService.attachCartToCurrentUser();
        this.loading = false;
        this.successMessage = 'Đăng ký thành công';
        setTimeout(() => this.handleAuthSuccess(), 500);
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error.error?.error || 'Đăng ký thất bại';
      }
    });
  }

  close() {
    this.closePopup.emit();
  }

  private handleAuthSuccess() {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

    this.closePopup.emit();

    if (returnUrl) {
      this.router.navigateByUrl(returnUrl);
    }
  }
}
