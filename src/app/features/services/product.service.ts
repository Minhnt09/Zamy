import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, finalize, map, of, shareReplay, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Product {
  id: number;
  name: string;
  image: string;
  price: number;
  color?: string;
  size?: string;
  sizes?: string[];
  stock?: number;
  code?: string;
}

interface ApiResponse<T> { data: T; }

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly baseUrl = `${environment.apiUrl}/products`;
  private products$?: Observable<Product[]>;
  private refreshingProducts$?: Observable<Product[]>;
  private readonly productById = new Map<number, Observable<Product>>();

  constructor(private readonly http: HttpClient) {}

  getAllProducts(): Observable<Product[]> {
    if (!this.products$) this.products$ = this.createProductsRequest();
    return this.products$;
  }

  refreshProducts(): Observable<Product[]> {
    if (!this.refreshingProducts$) {
      this.refreshingProducts$ = this.requestProducts().pipe(
        tap((products) => {
          this.products$ = of(products).pipe(shareReplay({ bufferSize: 1, refCount: false }));
          this.productById.clear();
        }),
        finalize(() => { this.refreshingProducts$ = undefined; }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.refreshingProducts$;
  }

  invalidateProducts(): void {
    this.products$ = undefined;
    this.productById.clear();
  }

  getProductById(id: number): Observable<Product> {
    const cached = this.productById.get(id);
    if (cached) return cached;
    const request$ = this.http.get<ApiResponse<Product>>(`${this.baseUrl}/${id}`).pipe(
      map((response) => response.data),
      catchError((error: unknown) => { this.productById.delete(id); return throwError(() => error); }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.productById.set(id, request$);
    return request$;
  }

  private createProductsRequest(): Observable<Product[]> {
    let request$: Observable<Product[]>;
    request$ = this.requestProducts().pipe(
      catchError((error: unknown) => {
        if (this.products$ === request$) this.products$ = undefined;
        return throwError(() => error);
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    return request$;
  }

  private requestProducts(): Observable<Product[]> {
    return this.http.get<ApiResponse<Product[]>>(this.baseUrl).pipe(map((response) => response.data));
  }
}
