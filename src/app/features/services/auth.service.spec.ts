import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

describe('AuthService current user', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AuthService]
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('shares and caches one /auth/me request for the current token', () => {
    localStorage.setItem('userToken', 'test-token');
    let first: unknown;
    let second: unknown;
    service.loadCurrentUser().subscribe((user) => first = user);
    service.loadCurrentUser().subscribe((user) => second = user);

    const request = http.expectOne(`${environment.apiUrl}/auth/me`);
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-token');
    request.flush({ user: { id: 1, name: 'Zamy', email: 'zamy@example.test', role: 'user' } });

    let cached: unknown;
    service.loadCurrentUser().subscribe((user) => cached = user);
    http.expectNone(`${environment.apiUrl}/auth/me`);
    expect(first).toEqual(cached);
    expect(second).toEqual(cached);
  });

  it('does not reuse an in-flight or validated cache when the token changes', () => {
    localStorage.setItem('userToken', 'first-token');
    service.loadCurrentUser().subscribe();
    const first = http.expectOne(`${environment.apiUrl}/auth/me`);
    expect(first.request.headers.get('Authorization')).toBe('Bearer first-token');

    localStorage.setItem('userToken', 'second-token');
    service.loadCurrentUser().subscribe();
    const second = http.expectOne(`${environment.apiUrl}/auth/me`);
    expect(second.request.headers.get('Authorization')).toBe('Bearer second-token');

    first.flush({ user: { id: 1, name: 'First', email: 'first@example.test', role: 'user' } });
    second.flush({ user: { id: 2, name: 'Second', email: 'second@example.test', role: 'user' } });
    expect(service.getCurrentUser()?.name).toBe('Second');
  });

  it('clears cached identity on logout and after 401 or 403 responses', () => {
    localStorage.setItem('userToken', 'test-token');
    service.loadCurrentUser().subscribe();
    http.expectOne(`${environment.apiUrl}/auth/me`).flush({ user: { id: 1, name: 'Zamy', email: 'zamy@example.test', role: 'user' } });
    service.logout();
    expect(service.getCurrentUser()).toBeNull();

    for (const response of [
      { status: 401, statusText: 'Unauthorized' },
      { status: 403, statusText: 'Forbidden' }
    ]) {
      localStorage.setItem('userToken', 'test-token');
      service.loadCurrentUser().subscribe();
      http.expectOne(`${environment.apiUrl}/auth/me`).flush({ error: 'expired' }, response);
      expect(service.getToken()).toBeNull();
      expect(service.getCurrentUser()).toBeNull();
      service.loadCurrentUser().subscribe();
      http.expectNone(`${environment.apiUrl}/auth/me`);
    }
  });

  it('replaces an anonymous state after a successful login', () => {
    expect(service.getCurrentUser()).toBeNull();
    service.login({ email: 'zamy@example.test', password: 'password' }).subscribe();
    http.expectOne(`${environment.apiUrl}/auth/login`).flush({
      message: 'ok',
      token: 'new-token',
      user: { id: 1, name: 'Zamy', email: 'zamy@example.test', role: 'user' }
    });

    expect(service.getCurrentUser()?.name).toBe('Zamy');
    expect(service.getToken()).toBe('new-token');
  });
});
