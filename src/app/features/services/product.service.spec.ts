import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ProductService } from './product.service';
import { environment } from '../../environments/environment';

describe('ProductService cache', () => {
  let service: ProductService;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/products`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ProductService]
    });
    service = TestBed.inject(ProductService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('shares one products request between concurrent subscribers', () => {
    let first: unknown;
    let second: unknown;
    service.getAllProducts().subscribe((value) => first = value);
    service.getAllProducts().subscribe((value) => second = value);
    const request = http.expectOne(url);
    request.flush({ data: [{ id: 1 }] });
    expect(first).toEqual([{ id: 1 }]);
    expect(second).toEqual([{ id: 1 }]);
  });

  it('allows a later request after a failed initial load', () => {
    service.getAllProducts().subscribe({ error: () => undefined });
    http.expectOne(url).flush('offline', { status: 503, statusText: 'Unavailable' });
    let result: unknown;
    service.getAllProducts().subscribe((value) => result = value);
    http.expectOne(url).flush({ data: [] });
    expect(result).toEqual([]);
  });

  it('shares a refresh request and replaces the list cache', () => {
    service.getAllProducts().subscribe();
    http.expectOne(url).flush({ data: [{ id: 1 }] });

    let firstRefresh: unknown;
    let secondRefresh: unknown;
    service.refreshProducts().subscribe((value) => firstRefresh = value);
    service.refreshProducts().subscribe((value) => secondRefresh = value);
    http.expectOne(url).flush({ data: [{ id: 2 }] });

    let cached: unknown;
    service.getAllProducts().subscribe((value) => cached = value);
    expect(firstRefresh).toEqual([{ id: 2 }]);
    expect(secondRefresh).toEqual([{ id: 2 }]);
    expect(cached).toEqual([{ id: 2 }]);
  });

  it('invalidates a cached product detail after a successful refresh', () => {
    service.getProductById(1).subscribe();
    http.expectOne(`${url}/1`).flush({ data: { id: 1, name: 'Before refresh' } });

    service.refreshProducts().subscribe();
    http.expectOne(url).flush({ data: [{ id: 1, name: 'After refresh' }] });

    let detail: unknown;
    service.getProductById(1).subscribe((value) => detail = value);
    http.expectOne(`${url}/1`).flush({ data: { id: 1, name: 'After refresh' } });
    expect(detail).toEqual({ id: 1, name: 'After refresh' });
  });
});
