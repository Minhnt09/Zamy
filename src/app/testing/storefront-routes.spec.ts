import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { environment } from '../environments/environment';

describe('Zamy storefront routes', () => {
  it('keeps the shell and shows only the latest product when requests complete out of order', async () => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes)],
    });
    const http = TestBed.inject(HttpTestingController);
    const url = environment.apiUrl + '/products';
    const harness = await RouterTestingHarness.create('/products/1');
    const first = http.expectOne(url + '/1');
    const list = http.expectOne(url);
    list.flush({ data: [] });

    await harness.navigateByUrl('/products/2');
    http.expectOne(url + '/2').flush({
      data: {
        id: 2, name: 'Đầm mới', price: 400000, image: '/assets/img/dress1.png',
        stock: 2, variants: [{ size: 'S', stock: 0 }, { size: 'M', stock: 2 }],
      },
    });
    first.flush({ data: { id: 1, name: 'Đầm cũ' } });

    harness.detectChanges();
    const page = harness.fixture.nativeElement as HTMLElement;
    expect(page.querySelectorAll('app-navbar').length).toBe(1);
    expect(page.querySelector('h1')?.textContent).toContain('Đầm mới');
    expect((page.querySelector('button[aria-label="S hết hàng"]') as HTMLButtonElement)?.disabled).toBeTrue();
    (page.querySelector('button[aria-label="M"]') as HTMLButtonElement).click();
    harness.detectChanges();
    expect(page.textContent).toContain('Còn 2 sản phẩm size M');
    const buy = [...page.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Mua ngay');
    buy?.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toContain('/home?login=1');
    expect(page.querySelector('dialog[open]')).toBeTruthy();
    sessionStorage.clear();
    http.verify();
  });
});
