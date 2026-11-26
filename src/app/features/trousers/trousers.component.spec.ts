import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrousersComponent } from './trousers.component';
import { testProviders } from '../../testing/test-providers';

describe('TrousersComponent', () => {
  let component: TrousersComponent;
  let fixture: ComponentFixture<TrousersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrousersComponent],
      providers: testProviders
    })
    .compileComponents();

    fixture = TestBed.createComponent(TrousersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
