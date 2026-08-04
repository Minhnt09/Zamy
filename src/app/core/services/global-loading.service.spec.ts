import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { GlobalLoadingService } from './global-loading.service';

describe('GlobalLoadingService', () => {
  let service: GlobalLoadingService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [GlobalLoadingService] });
    service = TestBed.inject(GlobalLoadingService);
  });

  it('does not go negative when cleanup runs more than once', fakeAsync(() => {
    service.endBlocking();
    tick(180);
    expect(service.isLoading()).toBeFalse();

    service.beginBlocking();
    service.beginBlocking();
    tick(180);
    expect(service.isLoading()).toBeTrue();
    service.endBlocking();
    expect(service.isLoading()).toBeTrue();
    service.endBlocking();
    service.endBlocking();
    expect(service.isLoading()).toBeFalse();
  }));
});
