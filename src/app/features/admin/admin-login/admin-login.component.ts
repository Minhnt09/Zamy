import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './admin-login.component.html'
})
export class AdminLoginComponent {
  email = '';
  password = '';

  // loginApi = 'http://localhost:3000/auth/admin/login';
  loginApi = `${environment.apiUrl}/auth/admin/login`;

  constructor(private http: HttpClient, private router: Router) {}

  login() {
    this.http.post<any>(this.loginApi, {
      email: this.email,
      password: this.password
    }).subscribe({
      next: (res) => {
        // console.log('Login response:', res);

        localStorage.setItem('adminToken', res.token);
        localStorage.setItem('adminUser', JSON.stringify(res.user));

        this.router.navigate(['/admin/products']);
      },
      error: (err) => {
        alert(err.error?.error || 'Đăng nhập thất bại');
      }
    });
  }
}
