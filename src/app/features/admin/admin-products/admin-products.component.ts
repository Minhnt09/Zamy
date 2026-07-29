import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './admin-products.component.html'
})
export class AdminProductsComponent implements OnInit {
  products: any[] = [];

  // api="https://my-app-uc3a.onrender.com/api/products";
  api = `${environment.apiUrl}/products`;

  editingId: number | null = null;
  newProduct: any = this.getEmptyProduct();
  productErrors: any = {};
  submitError = '';
  loadError = '';
  loading = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private notification: NotificationService
  ) {}

  ngOnInit() {
    this.loadProducts();
  }

  getEmptyProduct() {
    return {
      name: '',
      price: '',
      image: '',
      code: '',
      color: '',
      size: '',
      sizes: '',
      stock: ''
    };
  }

  loadProducts() {
    this.loading = true;
    this.http.get<any>(this.api).subscribe({
      next: (res) => {
        console.log('Products response:', res);
        this.products = res.data;
        this.loadError = '';
        this.loading = false;
      },
      error: (err) => {
        console.error('Load products error:', err);
        this.loadError = 'Không tải được danh sách sản phẩm';
        this.loading = false;
      }
    });
  }

  submitProduct() {
    if (!this.validateProduct()) {
      return;
    }

    if (this.editingId) {
      this.updateProduct();
    } else {
      this.addProduct();
    }
  }

  validateProduct() {
    this.productErrors = {};
    this.submitError = '';

    if (!String(this.newProduct.name || '').trim()) {
      this.productErrors.name = 'Vui lòng nhập Product name';
    }

    if (!String(this.newProduct.image || '').trim()) {
      this.productErrors.image = 'Vui lòng nhập Image URL';
    }

    if (this.newProduct.price === '' || this.newProduct.price === null || this.newProduct.price === undefined) {
      this.productErrors.price = 'Vui lòng nhập Price';
    } else if (Number(this.newProduct.price) < 0) {
      this.productErrors.price = 'Price phải là số dương';
    }

    if (!String(this.newProduct.code || '').trim()) {
      this.productErrors.code = 'Vui lòng nhập Code';
    }

    if (!String(this.newProduct.color || '').trim()) {
      this.productErrors.color = 'Vui lòng nhập Color';
    }

    if (this.parseSizes(this.newProduct.sizes || this.newProduct.size).length === 0) {
      this.productErrors.size = 'Vui lòng nhập Size';
    }

    if (this.newProduct.stock === '' || this.newProduct.stock === null || this.newProduct.stock === undefined) {
      this.productErrors.stock = 'Vui lòng nhập Stock';
    } else if (Number(this.newProduct.stock) < 0) {
      this.productErrors.stock = 'Stock phải là số dương';
    }

    return Object.keys(this.productErrors).length === 0;
  }

  addProduct() {
    this.http.post(this.api, this.buildProductPayload(), this.getAuthHeaders()).subscribe({
      next: () => {
        this.notification.success('Tạo sản phẩm thành công.');
        this.loadProducts();
        this.newProduct = this.getEmptyProduct();
        this.productErrors = {};
        this.submitError = '';
      },
      error: (err) => {
        this.submitError = err.error?.error || 'Thêm sản phẩm thất bại';
      }
    });
  }

  editProduct(product: any) {
    this.editingId = product.id;
    this.newProduct = {
      name: product.name,
      price: product.price,
      image: product.image,
      code: product.code,
      color: product.color,
      size: product.size,
      sizes: Array.isArray(product.sizes) ? product.sizes.join(', ') : product.size,
      stock: product.stock
    };
    this.productErrors = {};
    this.submitError = '';
  }

  updateProduct() {
    this.http.put(`${this.api}/${this.editingId}`, this.buildProductPayload(), this.getAuthHeaders()).subscribe({
      next: () => {
        this.loadProducts();
        this.cancelEdit();
      },
      error: (err) => {
        this.submitError = err.error?.error || 'Cập nhật sản phẩm thất bại';
      }
    });
  }

  cancelEdit() {
    this.editingId = null;
    this.newProduct = this.getEmptyProduct();
    this.productErrors = {};
    this.submitError = '';
  }

  deleteProduct(id: number) {
    if (confirm('Delete product?')) {
      this.http.delete(this.api + '/' + id, this.getAuthHeaders()).subscribe({
        next: () => {
          this.loadProducts();
        },
        error: (err) => {
          this.loadError = err.error?.error || 'Xoá sản phẩm thất bại';
        }
      });
    }
  }

  logout() {
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminToken');
    this.router.navigate(['/admin/login']);
  }

  getAuthHeaders() {
    const token = localStorage.getItem('adminToken');

    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`
      })
    };
  }

  private buildProductPayload() {
    const sizes = this.parseSizes(this.newProduct.sizes || this.newProduct.size);

    return {
      ...this.newProduct,
      size: sizes[0],
      sizes
    };
  }

  private parseSizes(value: string) {
    return String(value || '')
      .split(',')
      .map(size => size.trim())
      .filter(Boolean);
  }
}
