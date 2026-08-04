import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShirtComponent } from './shirt.component';
import { testProviders } from '../../testing/test-providers';

describe('ShirtComponent', () => {
  let component: ShirtComponent;
  let fixture: ComponentFixture<ShirtComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShirtComponent],
      providers: testProviders
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShirtComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
