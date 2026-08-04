import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientModule } from '@angular/common/http';

import { AdminProductsComponent } from './admin-products.component';
import { testProviders } from '../../../testing/test-providers';

describe('AdminProductsComponent', () => {
  let component: AdminProductsComponent;
  let fixture: ComponentFixture<AdminProductsComponent>;

  beforeEach(async () => {
    TestBed.overrideComponent(AdminProductsComponent, {
      remove: { imports: [HttpClientModule] }
    });
    await TestBed.configureTestingModule({
      imports: [AdminProductsComponent],
      providers: testProviders
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminProductsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
