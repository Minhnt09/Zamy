import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SkirtComponent } from './skirt.component';
import { testProviders } from '../../testing/test-providers';

describe('SkirtComponent', () => {
  let component: SkirtComponent;
  let fixture: ComponentFixture<SkirtComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkirtComponent],
      providers: testProviders
    })
    .compileComponents();

    fixture = TestBed.createComponent(SkirtComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
