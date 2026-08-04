import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, finalize, map, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { blockingLoadingContext } from '../../core/http/loading-context';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface AuthResponse {
  message: string;
  token: string;
  user: AuthUser;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly tokenKey = 'userToken';
  private readonly userKey = 'user';
  private readonly api = `${environment.apiUrl}/auth`;
  private readonly currentUserSubject = new BehaviorSubject<AuthUser | null>(this.getStoredUser());
  private currentUserRequest$?: Observable<AuthUser | null>;
  private currentUserRequestToken?: string;
  private validatedToken?: string;

  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  register(payload: { name: string; email: string; password: string }) {
    return this.http.post<AuthResponse>(`${this.api}/register`, payload, { context: blockingLoadingContext() }).pipe(
      tap(response => this.storeSession(response))
    );
  }

  login(payload: { email: string; password: string }) {
    return this.http.post<AuthResponse>(`${this.api}/login`, payload, { context: blockingLoadingContext() }).pipe(
      tap(response => this.storeSession(response))
    );
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.currentUserSubject.next(null);
    this.validatedToken = undefined;
    this.currentUserRequest$ = undefined;
    this.currentUserRequestToken = undefined;
  }

  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  getCurrentUser() {
    return this.currentUserSubject.value;
  }

  loadCurrentUser(): Observable<AuthUser | null> {
    const token = this.getToken();

    if (!token) {
      return of(null);
    }

    if (this.validatedToken === token) return of(this.currentUserSubject.value);
    if (this.currentUserRequest$ && this.currentUserRequestToken === token) return this.currentUserRequest$;

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    this.currentUserRequestToken = token;
    this.currentUserRequest$ = this.http.get<{ user: AuthUser }>(`${this.api}/me`, { headers }).pipe(
      map((response) => response.user),
      tap((user) => {
        if (this.getToken() === token) {
          localStorage.setItem(this.userKey, JSON.stringify(user));
          this.currentUserSubject.next(user);
          this.validatedToken = token;
        }
      }),
      catchError(() => {
        if (this.getToken() === token) this.logout();
        return of(null);
      }),
      finalize(() => {
        if (this.currentUserRequestToken === token) {
          this.currentUserRequest$ = undefined;
          this.currentUserRequestToken = undefined;
        }
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    return this.currentUserRequest$;
  }

  private storeSession(response: AuthResponse) {
    localStorage.setItem(this.tokenKey, response.token);
    localStorage.setItem(this.userKey, JSON.stringify(response.user));
    this.currentUserSubject.next(response.user);
    this.validatedToken = response.token;
  }

  private getStoredUser(): AuthUser | null {
    const rawUser = localStorage.getItem(this.userKey);

    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser) as AuthUser;
    } catch {
      localStorage.removeItem(this.userKey);
      return null;
    }
  }
}
