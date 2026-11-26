import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private _products$ = new BehaviorSubject<any[]>([]);
  products$ = this._products$.asObservable();

  setProducts(products: any[]) {
    this._products$.next(products);
  }

  getProducts(): any[] {
    return this._products$.getValue();
  }

  clear() {
    this._products$.next([]);
  }
}
