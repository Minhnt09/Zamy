import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NavbarComponent } from './navbar.component';
import { testProviders } from '../../../testing/test-providers';
import { GlobalLoadingService } from '../../../core/services/global-loading.service';

describe('NavbarComponent', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: testProviders
    })
    .compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('opens the login panel without activating global loading', () => {
    const loading = TestBed.inject(GlobalLoadingService);
    component.openLogin();

    expect(component.showLogin).toBeTrue();
    expect(loading.isLoading()).toBeFalse();
  });
});
