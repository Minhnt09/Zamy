import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReturnPolicyComponent } from './return-policy.component';
import { testProviders } from '../../testing/test-providers';

describe('ReturnPolicyComponent', () => {
  let component: ReturnPolicyComponent;
  let fixture: ComponentFixture<ReturnPolicyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReturnPolicyComponent],
      providers: testProviders
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReturnPolicyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
