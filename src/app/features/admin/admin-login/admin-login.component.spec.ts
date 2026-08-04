import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientModule } from '@angular/common/http';

import { AdminLoginComponent } from './admin-login.component';
import { testProviders } from '../../../testing/test-providers';

describe('AdminLoginComponent', () => {
  let component: AdminLoginComponent;
  let fixture: ComponentFixture<AdminLoginComponent>;

  beforeEach(async () => {
    TestBed.overrideComponent(AdminLoginComponent, {
      remove: { imports: [HttpClientModule] }
    });
    await TestBed.configureTestingModule({
      imports: [AdminLoginComponent],
      providers: testProviders
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminLoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
