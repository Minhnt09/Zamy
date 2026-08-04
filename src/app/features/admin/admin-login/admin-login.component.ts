import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { blockingLoadingContext } from '../../../core/http/loading-context';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './admin-login.component.html'
})
export class AdminLoginComponent {
  email = '';
  password = '';
  errorMessage = '';
  loginApi = `${environment.apiUrl}/auth/admin/login`;

  constructor(private http: HttpClient, private router: Router) {}

  login() {
    const email = this.email.trim();
    const password = this.password.trim();

    if (!email || !password) {
      this.errorMessage = 'Vui lòng nhập đầy đủ trường thông tin';
      return;
    }

    this.errorMessage = '';

    this.http.post<any>(this.loginApi, {
      email,
      password
    }, { context: blockingLoadingContext() }).subscribe({
      next: (res) => {
        localStorage.setItem('adminToken', res.token);
        localStorage.setItem('adminUser', JSON.stringify(res.user));

        this.router.navigate(['/admin/products']);
      },
      error: () => {
        this.errorMessage = 'Tài khoản hoặc mật khẩu sai';
      }
    });
  }
}
