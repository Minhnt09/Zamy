import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-products-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './products-admin.component.html'
})
export class ProductsAdminComponent implements OnInit {

  products:any[]=[];

  // api="https://my-app-uc3a.onrender.com/api/products";
  api = `${environment.apiUrl}/products`;

  editingId: number | null = null;

  newProduct: any = this.getEmptyProduct();

  constructor( private http:HttpClient,private router: Router){}

  ngOnInit(){
    this.loadProducts();
  }

  getEmptyProduct(){
    return {
      name: '',
      price: '',
      image: '',
      code: '',
      color: '',
      size: '',
      stock: ''
    };
  }

  loadProducts() {
  this.http.get<any>(this.api).subscribe({
    next: (res) => {
      console.log('Products response:', res);
      this.products = res.data;
    },
    error: (err) => {
      console.error('Load products error:', err);
      alert('Không tải được danh sách sản phẩm');
    }
  });
}

  submitProduct() {
    if(!this.newProduct.name || !this.newProduct.image || !this.newProduct.code){
      alert("Vui lòng nhập name, image và code");
      return;
    }
    if(this.newProduct.price === '' || Number(this.newProduct.price) < 0){
      alert("Price phải là số dương");
      return;
    }
    if(this.editingId){
      this.updateProduct();
    }else{
      this.addProduct();
    }
  }

  addProduct() {
    this.http.post(this.api, this.newProduct, this.getAuthHeaders()).subscribe({
      next: () => {
        this.loadProducts();
        this.newProduct = this.getEmptyProduct();
      },
      error: (err) => {
        alert(err.error?.error || 'Thêm sản phẩm thất bại');
      }
    });
  }

  editProduct(product:any) {
    this.editingId = product.id;

    this.newProduct = {
      name: product.name,
      price: product.price,
      image: product.image,
      code: product.code,
      color: product.color,
      size: product.size,
      stock: product.stock
    };
  }

  updateProduct() {
    this.http.put(`${this.api}/${this.editingId}`, this.newProduct, this.getAuthHeaders()).subscribe({
      next: () => {
        this.loadProducts();
        this.cancelEdit();
      },
      error: (err) => {
        alert(err.error?.error || 'Cập nhật sản phẩm thất bại');
      }
    });
  }

  cancelEdit() {
    this.editingId = null;
    this.newProduct = this.getEmptyProduct();
  }

  deleteProduct(id: number) {
    if (confirm('Delete product?')) {
      this.http.delete(this.api + '/' + id, this.getAuthHeaders()).subscribe({
        next: () => {
          this.loadProducts();
        },
        error: (err) => {
          alert(err.error?.error || 'Xoá sản phẩm thất bại');
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

}