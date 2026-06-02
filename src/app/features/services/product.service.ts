import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface Product {
  id: number;
  name: string;
  image: string;
  price: number;
  color?: string;
  size?: string;
  stock?: number;
  code?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private baseUrl = `${environment.apiUrl}/products`;
  
  constructor(private http: HttpClient) {}

  getAllProducts() {
    return this.http.get<any>(this.baseUrl).pipe(
      map(res => res.data)
    );
  }
  getProductById(id: number) {
    return this.http.get<any>(`${this.baseUrl}/${id}`).pipe(
      map(res => res.data)
    );
  }
}
