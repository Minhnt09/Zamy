import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { NotificationService } from '../../../core/services/notification.service';
import { blockingLoadingContext } from '../../../core/http/loading-context';

type VariantFormValue = { size: string; stock: number | '' };
type ProductFormValue = {
  name: string;
  price: number | '';
  image: string;
  code: string;
  color: string;
  category: string;
  variants: VariantFormValue[];
};

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './admin-products.component.html'
})
export class AdminProductsComponent implements OnInit {
  products: any[] = [];
  readonly categories = [
    { slug: 'dress', label: 'Dress' },
    { slug: 'shirt', label: 'Shirt' },
    { slug: 'trousers', label: 'Trousers' },
    { slug: 'skirt', label: 'Skirt' }
  ];
  readonly sizeOptions = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  api = `${environment.apiUrl}/products`;

  editingId: number | null = null;
  newProduct: ProductFormValue = this.getEmptyProduct();
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

  getEmptyProduct(): ProductFormValue {
    return {
      name: '',
      price: '',
      image: '',
      code: '',
      color: '',
      category: '',
      variants: [{ size: '', stock: '' }]
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

    if (this.editingId !== null) {
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
    } else if (!Number.isInteger(Number(this.newProduct.price)) || Number(this.newProduct.price) <= 0) {
      this.productErrors.price = 'Price phải là số nguyên dương';
    }

    if (!String(this.newProduct.code || '').trim()) {
      this.productErrors.code = 'Vui lòng nhập Code';
    }

    if (!String(this.newProduct.color || '').trim()) {
      this.productErrors.color = 'Vui lòng nhập Color';
    }

    if (!this.newProduct.category) {
      this.productErrors.category = 'Vui lòng chọn Category';
    }

    if (!this.newProduct.variants.length) {
      this.productErrors.variants = 'Cần ít nhất một size';
    }

    const selectedSizes = new Set<string>();
    this.newProduct.variants.forEach((variant, index) => {
      const size = String(variant.size || '').trim().toUpperCase();
      if (!size) this.productErrors[`variantSize${index}`] = 'Chọn size';
      else if (selectedSizes.has(size)) this.productErrors[`variantSize${index}`] = 'Size bị trùng';
      else selectedSizes.add(size);

      if (variant.stock === '' || variant.stock === null || variant.stock === undefined) {
        this.productErrors[`variantStock${index}`] = 'Nhập stock';
      } else if (!Number.isInteger(Number(variant.stock)) || Number(variant.stock) < 0) {
        this.productErrors[`variantStock${index}`] = 'Stock là số nguyên >= 0';
      }
    });

    if (Object.keys(this.productErrors).some((key) => key.startsWith('variant'))) {
      this.productErrors.variants = 'Kiểm tra lại size và stock';
    }

    return Object.keys(this.productErrors).length === 0;
  }

  addProduct() {
    this.http.post(this.api, this.buildProductPayload(), this.blockingAuthOptions()).subscribe({
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
      category: product.category || '',
      variants: Array.isArray(product.variants) && product.variants.length
        ? product.variants.map((variant: any) => ({ size: variant.size, stock: variant.stock }))
        : (Array.isArray(product.sizes) ? product.sizes : [product.size]).filter(Boolean)
          .map((size: string) => ({ size, stock: 0 }))
    };
    this.productErrors = {};
    this.submitError = '';
  }

  updateProduct() {
    this.http.put(`${this.api}/${this.editingId}`, this.buildProductPayload(), this.blockingAuthOptions()).subscribe({
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
    if (confirm('Vô hiệu hoá sản phẩm này?')) {
      this.http.delete(this.api + '/' + id, this.blockingAuthOptions()).subscribe({
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

  private blockingAuthOptions() {
    return { ...this.getAuthHeaders(), context: blockingLoadingContext() };
  }

  addVariant() {
    this.newProduct.variants.push({ size: '', stock: '' });
  }

  removeVariant(index: number) {
    if (this.newProduct.variants.length > 1) this.newProduct.variants.splice(index, 1);
  }

  private buildProductPayload() {
    return {
      name: this.newProduct.name.trim(),
      price: Number(this.newProduct.price),
      image: this.newProduct.image.trim(),
      code: this.newProduct.code.trim().toUpperCase(),
      color: this.newProduct.color.trim(),
      category: this.newProduct.category,
      variants: this.newProduct.variants.map((variant) => ({
        size: variant.size.trim().toUpperCase(),
        stock: Number(variant.stock)
      }))
    };
  }
}
