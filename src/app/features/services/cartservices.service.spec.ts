import { HttpClient, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { AuthService, AuthUser } from './auth.service';
import { CartservicesService } from './cartservices.service';
import { environment } from '../../environments/environment';

class AuthServiceStub {
  private readonly subject = new BehaviorSubject<AuthUser | null>(null);
  currentUser$ = this.subject.asObservable();
  token: string | null = null;

  getCurrentUser() { return this.subject.value; }
  getToken() { return this.token; }
  login(user: AuthUser, token = 'test-token') {
    this.token = token;
    this.subject.next(user);
  }
}

describe('CartservicesService', () => {
  let service: CartservicesService;
  let auth: AuthServiceStub;
  let http: HttpTestingController;
  let httpClient: HttpClient;

  beforeEach(() => {
    localStorage.clear();
    auth = new AuthServiceStub();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        CartservicesService,
        { provide: AuthService, useValue: auth },
      ],
    });
    service = TestBed.inject(CartservicesService);
    http = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
  });

  afterEach(() => http.verify());

  it('keeps a guest cart in localStorage across service recreation', () => {
    service.addToCart({ id: 1, name: 'Dress', price: 100, size: 'M' }, 2, 'M');
    expect(JSON.parse(localStorage.getItem('cart') || '[]')).toEqual(jasmine.arrayContaining([
      jasmine.objectContaining({ id: 1, selectedSize: 'M', qty: 2 }),
    ]));

    const reloaded = new CartservicesService(auth as unknown as AuthService, httpClient);
    expect(reloaded.getCartItems()).toEqual(jasmine.arrayContaining([
      jasmine.objectContaining({ id: 1, selectedSize: 'M', qty: 2 }),
    ]));
  });

  it('merges guest cart into DB and clears guest storage only after success', () => {
    service.addToCart({ id: 1, name: 'Dress', price: 100, size: 'M' }, 2, 'M');
    auth.login({ id: 9, name: 'User', email: 'user@example.test', role: 'user' });

    const request = http.expectOne(`${environment.apiUrl}/cart/merge`);
    expect(request.request.body).toEqual({ items: [{ productId: 1, size: 'M', quantity: 2 }] });
    expect(localStorage.getItem('cart')).not.toBeNull();

    request.flush({ data: { id: 3, items: [{
      id: 7, productId: 1, code: 'DSC001', name: 'Dress', image: 'image.jpg', color: 'Blue',
      price: 100, size: 'M', quantity: 2, stock: 8,
    }] } });

    expect(localStorage.getItem('cart')).toBeNull();
    expect(service.getCartItems()).toEqual(jasmine.arrayContaining([
      jasmine.objectContaining({ id: 1, cartItemId: 7, qty: 2, selectedSize: 'M' }),
    ]));
  });
});
