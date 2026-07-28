import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Observable, catchError, shareReplay, tap, throwError, timeout } from 'rxjs';
import { environment } from '../../environments/environment';

interface HealthResponse {
  status: 'ok';
  message: string;
  timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class BackendStatusService {
  readonly isBackendReady = signal(false);
  readonly isWakingUp = signal(false);
  readonly startupError = signal<string | null>(null);
  readonly hasStartupProblem = computed(() => this.startupError() !== null);
  private inFlightHealthCheck?: Observable<HealthResponse>;
  private readonly healthHttp: HttpClient;

  constructor(handler: HttpBackend) {
    // HttpBackend deliberately bypasses interceptors, preventing a /health loop.
    this.healthHttp = new HttpClient(handler);
  }

  ensureBackendReady(): Observable<HealthResponse> {
    if (this.isBackendReady()) {
      return new Observable<HealthResponse>(subscriber => {
        subscriber.next({ status: 'ok', message: 'Server is running', timestamp: new Date().toISOString() });
        subscriber.complete();
      });
    }

    if (!this.inFlightHealthCheck) {
      this.isWakingUp.set(true);
      this.startupError.set(null);
      this.inFlightHealthCheck = this.healthHttp.get<HealthResponse>(`${environment.apiUrl}/health`).pipe(
        timeout(35_000),
        tap(() => this.isBackendReady.set(true)),
        catchError(() => {
          this.startupError.set('Không thể kết nối máy chủ. Vui lòng thử lại sau ít phút.');
          return throwError(() => new Error('Backend health check failed'));
        }),
        tap({ finalize: () => {
          this.isWakingUp.set(false);
          this.inFlightHealthCheck = undefined;
        }}),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }

    return this.inFlightHealthCheck;
  }

  retryBackend(): void {
    this.ensureBackendReady().subscribe({ error: () => undefined });
  }
}
