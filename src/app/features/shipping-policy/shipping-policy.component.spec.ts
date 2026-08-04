import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShippingPolicyComponent } from './shipping-policy.component';
import { testProviders } from '../../testing/test-providers';

describe('ShippingPolicyComponent', () => {
  let component: ShippingPolicyComponent;
  let fixture: ComponentFixture<ShippingPolicyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShippingPolicyComponent],
      providers: testProviders
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShippingPolicyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
