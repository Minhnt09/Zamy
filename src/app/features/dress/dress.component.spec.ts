import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { DressComponent } from './dress.component';
import { environment } from '../../environments/environment';
import { testProviders } from '../../testing/test-providers';

describe('DressComponent', () => {
  let component: DressComponent;
  let fixture: ComponentFixture<DressComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DressComponent],
      providers: testProviders
    })
    .compileComponents();

    fixture = TestBed.createComponent(DressComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders dresses from a short mixed catalog regardless of position', () => {
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(`${environment.apiUrl}/products`).flush({
      data: [
        { id: 1, name: 'Áo sơ mi', category: 'shirt', image: '/assets/img/shirt1.png', price: 300000 },
        { id: 2, name: 'Đầm công sở', category: 'dress', image: '/assets/img/dress1.png', price: 500000 },
      ],
    });
    fixture.detectChanges();

    const page: HTMLElement = fixture.nativeElement;
    const cards = page.querySelectorAll('app-product-card');
    expect(component.product.map((product) => product.id)).toEqual([2]);
    expect(cards.length).toBe(1);
    expect(cards[0]?.textContent).toContain('Đầm công sở');
  });
});
