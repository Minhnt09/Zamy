import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DressComponent } from './dress.component';
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
});
