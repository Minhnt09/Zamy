import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { CatalogComponent } from './catalog.component';
import { environment } from '../../environments/environment';

describe('Storefront catalog', () => {
  it('keeps category and applies available size, price sorting and URL filters', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        provideRouter([{ path: 'dress', component: CatalogComponent, data: { heading: 'Đầm', category: 'dress' } }]),
      ],
    });

    const harness = await RouterTestingHarness.create('/dress?size=M&sort=price-desc');
    const http = TestBed.inject(HttpTestingController);
    const makeProduct = (id: number, name: string, category: string, stock: number, price: number) =>
      ({ id, name, category, price, image: '/assets/img/dress1.png', variants: [{ size: 'M', stock }], stock });
    http.expectOne(environment.apiUrl + '/products').flush({ data: [
      makeProduct(1, 'Đầm rẻ', 'dress', 2, 200000), makeProduct(2, 'Đầm cao cấp', 'dress', 2, 500000),
      makeProduct(3, 'Đầm hết hàng', 'dress', 0, 400000), makeProduct(4, 'Áo khác danh mục', 'shirt', 2, 300000),
    ] });

    harness.detectChanges();
    const page = harness.routeNativeElement!;
    const cards = () => Array.from(page.querySelectorAll('app-product-card'));
    expect(cards().map(card => card.textContent!.trim())).toEqual([
      jasmine.stringContaining('Đầm cao cấp'), jasmine.stringContaining('Đầm rẻ'),
    ]);

    await harness.navigateByUrl('/dress?size=M&max=300000');
    harness.detectChanges();
    expect(cards().length).toBe(1);
    expect(cards()[0].textContent).toContain('Đầm rẻ');
    http.verify();
  });
});
