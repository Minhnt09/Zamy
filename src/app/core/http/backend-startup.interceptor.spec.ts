import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { GlobalLoadingService } from '../services/global-loading.service';
import { environment } from '../../environments/environment';
import { backendStartupInterceptor } from './backend-startup.interceptor';
import { BLOCKING_LOADING } from './loading-context';

describe('backendStartupInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let loading: GlobalLoadingService;
  const url = `${environment.apiUrl}/products`;
  const blocking = new HttpContext().set(BLOCKING_LOADING, true);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([backendStartupInterceptor])),
        provideHttpClientTesting()
      ]
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    loading = TestBed.inject(GlobalLoadingService);
  });

  afterEach(() => http.verify());

  it('does not show global loading for unmarked read or write requests', fakeAsync(() => {
    client.get(url).subscribe();
    client.post(`${url}/1`, {}).subscribe();
    tick(180);
    expect(loading.isLoading()).toBeFalse();
    http.expectOne(url).flush({ data: [] });
    http.expectOne(`${url}/1`).flush({ data: {} });
  }));

  it('shows global loading only for an explicitly blocking action', fakeAsync(() => {
    client.post(`${url}/1`, {}, { context: blocking }).subscribe();
    tick(180);
    expect(loading.isLoading()).toBeTrue();
    http.expectOne(`${url}/1`).flush({ data: {} });
    expect(loading.isLoading()).toBeFalse();
  }));

  it('keeps global loading visible until concurrent blocking actions finish', fakeAsync(() => {
    client.post(`${url}/1`, {}, { context: blocking }).subscribe();
    client.post(`${url}/2`, {}, { context: blocking }).subscribe();
    tick(180);
    expect(loading.isLoading()).toBeTrue();

    http.expectOne(`${url}/1`).flush({ data: {} });
    expect(loading.isLoading()).toBeTrue();
    http.expectOne(`${url}/2`).flush({ data: {} });
    expect(loading.isLoading()).toBeFalse();
  }));

  it('cleans up global loading after an error or timeout', fakeAsync(() => {
    client.post(`${url}/1`, {}, { context: blocking }).subscribe({ error: () => undefined });
    tick(180);
    http.expectOne(`${url}/1`).flush({ error: 'invalid' }, { status: 400, statusText: 'Bad Request' });
    expect(loading.isLoading()).toBeFalse();

    client.post(`${url}/2`, {}, { context: blocking }).subscribe({ error: () => undefined });
    tick(180);
    http.expectOne(`${url}/2`);
    expect(loading.isLoading()).toBeTrue();
    tick(30_000);
    expect(loading.isLoading()).toBeFalse();
  }));
});
