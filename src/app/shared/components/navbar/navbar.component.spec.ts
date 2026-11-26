import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NavbarComponent } from './navbar.component';
import { testProviders } from '../../../testing/test-providers';
import { GlobalLoadingService } from '../../../core/services/global-loading.service';

describe('NavbarComponent', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;

  beforeEach(async () => {
    localStorage.clear();
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
    fixture.nativeElement.querySelector('button[aria-label="Đăng nhập"]').click();
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    expect(dialog.open).toBeTrue();

    expect(component.showLogin).toBeTrue();
    expect(loading.isLoading()).toBeFalse();
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('dialog')).toBeNull();
  });
});
